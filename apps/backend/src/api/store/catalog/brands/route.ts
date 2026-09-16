import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPublishedBrandSummaries } from "../brand-catalog"

/**
 * GET /store/catalog/brands — published official brand pages only.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const brands = await listPublishedBrandSummaries(req.scope)
  res.status(200).json({ brands, count: brands.length })
}
