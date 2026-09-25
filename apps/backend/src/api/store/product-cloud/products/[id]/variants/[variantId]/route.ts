import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../../modules/commerce-cloud/service"
import { resolveApprovedSeller } from "../../../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../../../catalog-edit-guard"
import { composeVariantFromAxes } from "../../../../variant-axes"

type RouteParams = { id: string; variantId: string }

const VARIANT_TYPES = [
  "Kleur",
  "Maat",
  "Inhoud",
  "Vermogen",
  "Spanning",
  "Materiaal",
  "Uitvoering",
  "Bundel",
] as const

const PatchVariantBody = z.object({
  variant_type: z.enum(VARIANT_TYPES).optional(),
  variant_value: z.string().trim().min(1).max(200).optional(),
  axes: z
    .array(
      z.object({
        axis: z.enum(VARIANT_TYPES),
        value: z.string().trim().min(1).max(120),
      })
    )
    .min(1)
    .max(6)
    .optional(),
  identifier_value: z.string().trim().min(1).max(64).optional(),
  identifier_type: z.enum(["GTIN", "MPN"]).optional(),
})

async function assertOwnVariant(
  scope: import("@medusajs/framework/types").MedusaContainer,
  productCloud: ProductCloudModuleService,
  productId: string,
  variantId: string,
  seller: { id: string; company_id?: string | null }
) {
  const product = await productCloud.retrieveProduct(productId)
  await assertSellerCanDirectEditCatalog(scope, product, seller)
  const variant = await productCloud.retrieveProductVariant(variantId)
  if (variant.product_id !== productId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Variant niet gevonden."
    )
  }
  return { product, variant }
}

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id, variantId } = req.params as RouteParams
  const parsed = PatchVariantBody.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige variant-update."
    )
  }
  const body = parsed.data
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const { variant } = await assertOwnVariant(
    req.scope,
    productCloud,
    id,
    variantId,
    seller
  )

  let nextType = body.variant_type
  let nextValue = body.variant_value
  if (body.axes?.length) {
    try {
      const composed = composeVariantFromAxes(body.axes)
      nextType = composed.variant_type
      nextValue = composed.variant_value
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        err instanceof Error ? err.message : "Ongeldige variantassen."
      )
    }
  }

  const patch: Record<string, unknown> = { id: variantId }
  if (nextType) patch.variant_type = nextType
  if (nextValue) patch.variant_value = nextValue
  if (Object.keys(patch).length > 1) {
    await productCloud.updateProductVariants(patch)
  }

  const oldIdentifier = (
    await productCloud.listIdentifiers({ product_variant_id: variantId })
  )[0] as { id: string; identifier_value: string; identifier_type: string } | undefined

  if (body.identifier_value) {
    const identifiers = await productCloud.listIdentifiers({
      product_variant_id: variantId,
    })
    const current = identifiers[0]
    if (current) {
      const clash = await productCloud.listIdentifiers({
        identifier_value: body.identifier_value,
        identifier_type: body.identifier_type ?? current.identifier_type,
      })
      if (clash.some((c: { id: string }) => c.id !== current.id)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Deze EAN/GTIN bestaat al."
        )
      }
      await productCloud.updateIdentifiers({
        id: current.id,
        identifier_value: body.identifier_value,
        ...(body.identifier_type
          ? { identifier_type: body.identifier_type }
          : {}),
      })
      if (oldIdentifier && oldIdentifier.identifier_value !== body.identifier_value) {
        await productCloud.createProductFieldChanges({
          product_id: id,
          product_version_id: null,
          seller_id: seller.id,
          actor_customer_id: req.auth_context.actor_id,
          field_code: "variant.identifier",
          field_label: "EAN/GTIN gewijzigd",
          old_value: oldIdentifier.identifier_value,
          new_value: body.identifier_value,
          status: "current",
          reason: `variant:${variantId}`,
        })
      }
    } else {
      await productCloud.createIdentifiers({
        product_variant_id: variantId,
        identifier_type: body.identifier_type ?? "GTIN",
        identifier_value: body.identifier_value,
        country_scope: null,
      })
    }
  }

  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: null,
    seller_id: seller.id,
    actor_customer_id: req.auth_context.actor_id,
    field_code: "variant.updated",
    field_label: "Variant gewijzigd",
    old_value: `${variant.variant_type}: ${variant.variant_value}`,
    new_value: `${nextType ?? variant.variant_type}: ${nextValue ?? variant.variant_value}`,
    status: "current",
    reason: `variant:${variantId}`,
  })

  const updated = await productCloud.retrieveProductVariant(variantId)
  const identifiers = await productCloud.listIdentifiers({
    product_variant_id: variantId,
  })
  res.json({ variant: updated, identifiers })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id, variantId } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  await assertOwnVariant(req.scope, productCloud, id, variantId, seller)

  const allVariants = await productCloud.listProductVariants({
    product_id: id,
  })
  if (allVariants.length <= 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "De laatste variant kan niet worden verwijderd."
    )
  }

  const withdrawOffers =
    String(req.query?.withdraw_offers ?? "").toLowerCase() === "true" ||
    Boolean((req.body as { withdraw_offers?: boolean } | undefined)?.withdraw_offers)

  const identifiers = await productCloud.listIdentifiers({
    product_variant_id: variantId,
  })
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  if (commerce) {
    for (const iden of identifiers) {
      const offers = await commerce.listOffers({
        seller_id: seller.id,
        identifier_id: iden.id,
      })
      if (offers.length > 0 && !withdrawOffers) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Deze variant heeft nog een verkoopaanbod. Bevestig verwijderen met withdraw_offers=true om offers veilig in te trekken."
        )
      }
      for (const offer of offers) {
        await commerce.withdrawOffer(offer.id)
      }
    }
  }

  if (identifiers.length > 0) {
    await productCloud.softDeleteIdentifiers(
      identifiers.map((i: { id: string }) => i.id)
    )
  }
  await productCloud.softDeleteProductVariants([variantId])

  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: null,
    seller_id: seller.id,
    actor_customer_id: req.auth_context.actor_id,
    field_code: "variant.deleted",
    field_label: "Variant verwijderd",
    old_value: variantId,
    new_value: withdrawOffers ? "offers_withdrawn" : null,
    status: "current",
    reason: `variant:${variantId}`,
  })

  res.json({ ok: true, variant_id: variantId, offers_withdrawn: withdrawOffers })
}
