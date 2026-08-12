import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"
import type { StoreBulkMadeInEuropeBodyInput } from "../../validators"
import { upsertProductMadeInEurope } from "../../made-in-europe-helpers"

/**
 * POST /store/product-cloud/made-in-europe/bulk
 * Koppel hetzelfde productieprofiel/facility aan meerdere eigen producten.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreBulkMadeInEuropeBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const body = req.validatedBody

  const results: Array<{
    product_id: string
    ok: boolean
    score?: number | null
    is_made_in_europe?: boolean
    error?: string
  }> = []

  for (const productId of body.product_ids) {
    try {
      const product = await productCloud.retrieveProduct(productId)
      if (product.current_owner_seller_id !== seller.id) {
        results.push({
          product_id: productId,
          ok: false,
          error: "Geen eigenaar.",
        })
        continue
      }
      const assigned = await upsertProductMadeInEurope(req.scope, {
        product_id: productId,
        seller_id: seller.id,
        brand_id: product.brand_id,
        manufacturer_id: product.manufacturer_id,
        input: {
          production_facility_id: body.production_facility_id,
          assembly_eu_band: body.assembly_eu_band,
          parts_eu_level: body.parts_eu_level,
          materials_eu_level: body.materials_eu_level,
          primary_assembly_country: body.primary_assembly_country,
        },
      })
      results.push({
        product_id: productId,
        ok: true,
        score: assigned.score.score,
        is_made_in_europe: assigned.score.is_made_in_europe,
      })
    } catch (err) {
      results.push({
        product_id: productId,
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
