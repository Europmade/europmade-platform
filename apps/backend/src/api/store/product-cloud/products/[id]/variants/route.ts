import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../../catalog-edit-guard"
import {
  composeVariantFromAxes,
  suggestVariantAxesForCategory,
  VARIANT_AXIS_OPTIONS,
} from "../../../variant-axes"

type RouteParams = { id: string }

const AxisRow = z.object({
  axis: z.enum(VARIANT_AXIS_OPTIONS),
  value: z.string().trim().min(1).max(120),
})

const CreateVariantBody = z
  .object({
    variant_type: z.enum(VARIANT_AXIS_OPTIONS).optional(),
    variant_value: z.string().trim().min(1).max(200).optional(),
    axes: z.array(AxisRow).min(1).max(6).optional(),
    identifier_type: z.enum(["GTIN", "MPN"]).optional().default("GTIN"),
    identifier_value: z.string().trim().min(1).max(64),
    country_scope: z.string().trim().min(2).max(2).nullable().optional(),
    duplicate_from_variant_id: z.string().trim().min(1).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.axes?.length) return
    if (!body.variant_type || !body.variant_value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Geef axes óf variant_type + variant_value op.",
      })
    }
  })

/**
 * GET — list variants + suggested axes for category.
 * POST — create variant + identifier (owner only).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const variants = await productCloud.listProductVariants({ product_id: id })
  const links = await productCloud.listProductCategories({ product_id: id })
  let categoryName = "Algemeen"
  if (links[0]) {
    try {
      const cat = await productCloud.retrieveCategory(links[0].category_id)
      categoryName = String((cat as { name?: string }).name || categoryName)
    } catch {
      /* keep default */
    }
  }

  const withIds = []
  for (const v of variants) {
    const identifiers = await productCloud.listIdentifiers({
      product_variant_id: v.id,
    })
    withIds.push({ ...v, identifiers })
  }

  res.json({
    product_id: id,
    variants: withIds,
    suggested_axes: suggestVariantAxesForCategory(categoryName),
    allowed_variant_types: VARIANT_AXIS_OPTIONS,
    note: "Voorstellen zijn categorie-heuristiek; seller bevestigt/past aan. Geen automatische overschrijving van bestaande data.",
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const parsed = CreateVariantBody.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message ||
        "axes of variant_type/value en identifier_value zijn verplicht."
    )
  }
  const body = parsed.data

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const existingIden = await productCloud.listIdentifiers({
    identifier_value: body.identifier_value,
    identifier_type: body.identifier_type,
  })
  if (existingIden.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Deze EAN/GTIN bestaat al."
    )
  }

  let variantType = body.variant_type
  let variantValue = body.variant_value
  if (body.axes?.length) {
    try {
      const composed = composeVariantFromAxes(body.axes)
      variantType = composed.variant_type
      variantValue = composed.variant_value
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        err instanceof Error ? err.message : "Ongeldige variantassen."
      )
    }
  }

  if (body.duplicate_from_variant_id) {
    const source = await productCloud.retrieveProductVariant(
      body.duplicate_from_variant_id
    )
    if (source.product_id !== id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Bronvariant hoort niet bij dit product."
      )
    }
    if (!body.axes?.length && !body.variant_value) {
      variantType = source.variant_type as (typeof VARIANT_AXIS_OPTIONS)[number]
      variantValue = `${source.variant_value} (kopie)`
    }
  }

  if (!variantType || !variantValue) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "variant_type en variant_value zijn verplicht."
    )
  }

  const variant = await productCloud.createProductVariants({
    product_id: id,
    variant_type: variantType,
    variant_value: variantValue,
  })

  const identifier = await productCloud.createIdentifiers({
    product_variant_id: variant.id,
    identifier_type: body.identifier_type,
    identifier_value: body.identifier_value,
    country_scope: body.country_scope ?? null,
  })

  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: null,
    seller_id: seller.id,
    actor_customer_id: req.auth_context.actor_id,
    field_code: "variant.created",
    field_label: "Variant toegevoegd",
    old_value: null,
    new_value: `${variantType}: ${variantValue} / ${body.identifier_value}`,
    status: "current",
    reason: `variant:${variant.id}`,
  })

  res.status(201).json({ variant, identifier })
}
