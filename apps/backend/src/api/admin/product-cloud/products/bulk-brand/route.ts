import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"

const BodySchema = z.object({
  product_ids: z.array(z.string().trim().min(1)).min(1).max(200),
  brand_id: z.string().trim().min(1).optional(),
  dry_run: z.boolean().optional(),
  preview_only: z.boolean().optional(),
  transfer_reason: z.string().trim().max(2000).nullable().optional(),
})

async function brandLabel(
  partner: PartnerModuleService,
  brandId: string | null | undefined
): Promise<string> {
  if (!brandId) return "—"
  try {
    const brand = await partner.retrieveBrand(brandId)
    return (brand as { name?: string }).name?.trim() || brandId
  } catch {
    return brandId
  }
}

async function productTitle(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<string | null> {
  try {
    const versions = (await productCloud.listProductVersions(
      { product_id: productId },
      { order: { version_number: "DESC" }, take: 3 }
    )) as Array<{ title?: string; publication_status?: string }>
    const working =
      versions.find((v) => v.publication_status === "Gepubliceerd") ||
      versions[0]
    return working?.title?.trim() || null
  } catch {
    return null
  }
}

/**
 * POST /admin/product-cloud/products/bulk-brand
 * Atomic brand assignment for selected products (preview / dry_run / apply).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message || "Ongeldige bulk merk-actie."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const uniqueIds = [...new Set(parsed.data.product_ids)]

  const rows = []
  for (const productId of uniqueIds) {
    try {
      const product = await productCloud.retrieveProduct(productId)
      rows.push({
        product_id: productId,
        title: await productTitle(productCloud, productId),
        current_brand_id: product.brand_id || null,
        current_display: await brandLabel(partner, product.brand_id),
        valid: true,
        error: null as string | null,
      })
    } catch (err) {
      rows.push({
        product_id: productId,
        title: null,
        current_brand_id: null,
        current_display: "—",
        valid: false,
        error: err instanceof Error ? err.message : "Product niet gevonden",
      })
    }
  }

  if (parsed.data.preview_only) {
    let available_brands: Array<{ id: string; name: string }> = []
    try {
      const brands = (await partner.listBrands(
        {},
        { take: 300, order: { name: "ASC" } }
      )) as Array<{ id: string; name?: string }>
      available_brands = brands.map((b) => ({
        id: b.id,
        name: b.name?.trim() || b.id,
      }))
    } catch {
      available_brands = []
    }
    res.json({
      preview_only: true,
      count: rows.length,
      products: rows.map((r) => ({
        product_id: r.product_id,
        title: r.title,
        current_display: r.current_display,
        current_value: r.current_brand_id,
      })),
      available_brands,
    })
    return
  }

  const brandId = parsed.data.brand_id
  if (!brandId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kies een merk (brand_id)."
    )
  }

  let newDisplay: string
  try {
    await partner.retrieveBrand(brandId)
    newDisplay = await brandLabel(partner, brandId)
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Merk niet gevonden.")
  }

  const evaluated = rows.map((r) => ({
    product_id: r.product_id,
    title: r.title,
    current_display: r.current_display,
    new_display: newDisplay,
    current_value: r.current_brand_id,
    new_value: brandId,
    valid: r.valid,
    error: r.error,
  }))
  const invalid = evaluated.filter((r) => !r.valid)

  if (parsed.data.dry_run) {
    res.json({
      dry_run: true,
      all_valid: invalid.length === 0,
      count: evaluated.length,
      invalid_count: invalid.length,
      new_value: { brand_id: brandId, label: newDisplay },
      products: evaluated,
      invalid_products: invalid,
    })
    return
  }

  if (invalid.length > 0) {
    res.status(400).json({
      message:
        "Bulkactie geblokkeerd. Er zijn geen wijzigingen uitgevoerd.",
      all_valid: false,
      updated_count: 0,
      count: evaluated.length,
      invalid_count: invalid.length,
      products: evaluated,
      invalid_products: invalid,
    })
    return
  }

  const applied: string[] = []
  try {
    for (const row of evaluated) {
      await productCloud.updateProducts({
        id: row.product_id,
        brand_id: brandId,
      })
      await productCloud.createProductFieldChanges({
        product_id: row.product_id,
        product_version_id: null,
        seller_id: null,
        actor_customer_id: null,
        field_code: "brand_id",
        field_label: "Merk",
        old_value: row.current_value,
        new_value: brandId,
        status: "approved",
        reason:
          parsed.data.transfer_reason ||
          `Bulk merk-toewijzing (${uniqueIds.length} producten)`,
      })
      applied.push(row.product_id)
    }
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Bulk merk afgebroken na ${applied.length}/${uniqueIds.length}: ${
        err instanceof Error ? err.message : "fout"
      }`
    )
  }

  res.json({
    all_valid: true,
    updated_count: applied.length,
    count: uniqueIds.length,
    message: `${applied.length} product(en) bijgewerkt.`,
    products: evaluated,
  })
}
