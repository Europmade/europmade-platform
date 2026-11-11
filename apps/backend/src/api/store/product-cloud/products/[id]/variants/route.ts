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
import {
  applyShoeMaatToAxes,
  canonicalizeShoeMaat,
  presentVariantSize,
  shoeSizeOptions,
} from "../../../../../../modules/product-cloud/shoe-sizes"

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
  const categoryNames = await categoryNamesForProduct(productCloud, id)
  const categoryName = categoryNames[0] || "Algemeen"
  const shoe = shoeSizeOptions(categoryNames)

  const withIds = []
  for (const v of variants) {
    const identifiers = await productCloud.listIdentifiers({
      product_variant_id: v.id,
    })
    const row = v as { variant_type: string; variant_value: string }
    withIds.push({
      ...v,
      identifiers,
      size_label: presentVariantSize({
        variantType: row.variant_type,
        variantValue: row.variant_value,
        categoryNames,
      }),
    })
  }

  res.json({
    product_id: id,
    variants: withIds,
    suggested_axes: suggestVariantAxesForCategory(categoryName),
    allowed_variant_types: VARIANT_AXIS_OPTIONS,
    shoe_sizes: shoe,
    note: "Voorstellen zijn categorie-heuristiek; seller bevestigt/past aan. Geen automatische overschrijving van bestaande data.",
  })
}

async function categoryNamesForProduct(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<string[]> {
  const links = await productCloud.listProductCategories({ product_id: productId })
  const names: string[] = []
  for (const link of links) {
    try {
      const cat = await productCloud.retrieveCategory(
        (link as { category_id: string }).category_id
      )
      const name = String((cat as { name?: string }).name || "").trim()
      if (name) names.push(name)
    } catch {
      /* skip a missing category */
    }
  }
  return names
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Een verkoopbaar artikel is een zelfstandig product. Voeg geen variant toe; maak een nieuw product met een eigen EAN."
  )
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

  const categoryNames = await categoryNamesForProduct(productCloud, id)
  let variantType = body.variant_type
  let variantValue = body.variant_value
  if (body.axes?.length) {
    const sized = applyShoeMaatToAxes(body.axes, categoryNames)
    if (!sized.ok) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, sized.message)
    }
    try {
      const composed = composeVariantFromAxes(sized.axes)
      variantType = composed.variant_type
      variantValue = composed.variant_value
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        err instanceof Error ? err.message : "Ongeldige variantassen."
      )
    }
  } else if (variantType === "Maat" && variantValue) {
    const stored = canonicalizeShoeMaat(variantValue, categoryNames)
    if (!stored.ok) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, stored.message)
    }
    if ("value" in stored) variantValue = stored.value
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

  if (variantType === "Maat") {
    const existing = await productCloud.listProductVariants({ product_id: id })
    const duplicate = (existing as Array<{ variant_type: string; variant_value: string }>).some(
      (row) => row.variant_type === "Maat" && row.variant_value === variantValue
    )
    if (duplicate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Deze maat bestaat al als variant. Kies een andere maat."
      )
    }
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
