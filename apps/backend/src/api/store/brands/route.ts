import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveApprovedSeller } from "../product-cloud/resolve-seller"
import { listManageableBrands } from "./brand-helpers"

/**
 * GET /store/brands — merken beheerbaar door ingelogde seller/partner.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brands = await listManageableBrands(req.scope, seller)
  res.status(200).json({ brands, count: brands.length })
}
