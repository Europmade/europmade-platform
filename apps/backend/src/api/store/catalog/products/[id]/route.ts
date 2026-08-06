import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadCatalogProductDetail } from "../../catalog-helpers"

type RouteParams = { id: string }

/**
 * GET /store/catalog/products/:id — publieke PDP-payload.
 * Product Cloud + Buy Box (Commerce Cloud) + Offer-commercieel + Review-service.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  if (!id?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product id is verplicht."
    )
  }

  const region_code =
    typeof req.query.region_code === "string" ? req.query.region_code : "NL"

  const detail = await loadCatalogProductDetail(req.scope, id.trim(), region_code)
  if (!detail) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product niet gevonden of niet gepubliceerd."
    )
  }

  res.status(200).json(detail)
}
