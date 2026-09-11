import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadSellerCatalogPage } from "../../seller-catalog"

type RouteParams = { slug: string }

/**
 * GET /store/catalog/sellers/:slug — public page for an already approved seller.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params as RouteParams
  if (!slug?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "seller-slug is verplicht."
    )
  }
  const region_code =
    typeof req.query.region_code === "string" ? req.query.region_code : "NL"
  const page = await loadSellerCatalogPage(req.scope, slug.trim(), {
    region_code,
  })
  if (!page) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Seller niet gevonden."
    )
  }
  res.status(200).json(page)
}
