import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"
import type { StoreCsvMadeInEuropeBodyInput } from "../../validators"
import { upsertProductMadeInEurope } from "../../made-in-europe-helpers"
import { buildProductCloudPreview } from "../../product-preview"

/**
 * POST /store/product-cloud/made-in-europe/csv
 * Bulk via rijen (product_id / ean / sku) + stabiele Made in Europe-IDs.
 * Hergebruikt dezelfde assign-helper als single/bulk (geen parallelle importarchitectuur).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCsvMadeInEuropeBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const owned = (await productCloud.listProducts(
    { current_owner_seller_id: seller.id },
    { take: 1000 }
  )) as Array<{ id: string; brand_id: string; manufacturer_id: string }>

  const byId = new Map(owned.map((p) => [p.id, p]))
  const byEan = new Map<string, (typeof owned)[0]>()
  for (const product of owned) {
    try {
      const preview = await buildProductCloudPreview(productCloud, product.id)
      if (preview.identifier_value) {
        byEan.set(preview.identifier_value.trim(), product)
      }
    } catch {
      // skip
    }
  }

  const results: Array<{
    row: number
    product_id: string | null
    ok: boolean
    score?: number | null
    is_made_in_europe?: boolean
    error?: string
  }> = []

  let rowIndex = 0
  for (const row of req.validatedBody.rows) {
    rowIndex += 1
    let product = row.product_id ? byId.get(row.product_id) : undefined
    if (!product && row.ean) product = byEan.get(row.ean.trim())
    if (!product && row.sku) product = byEan.get(row.sku.trim())
    if (!product) {
      results.push({
        row: rowIndex,
        product_id: row.product_id ?? null,
        ok: false,
        error: "Product niet gevonden of geen eigenaar.",
      })
      continue
    }
    try {
      const assigned = await upsertProductMadeInEurope(req.scope, {
        product_id: product.id,
        seller_id: seller.id,
        brand_id: product.brand_id,
        manufacturer_id: product.manufacturer_id,
        input: {
          production_facility_id: row.production_facility_id,
          assembly_eu_band: row.assembly_eu_band,
          parts_eu_level: row.parts_eu_level,
          materials_eu_level: row.materials_eu_level,
          primary_assembly_country: row.primary_assembly_country,
        },
      })
      results.push({
        row: rowIndex,
        product_id: product.id,
        ok: true,
        score: assigned.score.score,
        is_made_in_europe: assigned.score.is_made_in_europe,
      })
    } catch (err) {
      results.push({
        row: rowIndex,
        product_id: product.id,
        ok: false,
        error: err instanceof Error ? err.message : "Mislukt",
      })
    }
  }

  res.status(200).json({
    count: results.length,
    success_count: results.filter((r) => r.ok).length,
    results,
  })
}
