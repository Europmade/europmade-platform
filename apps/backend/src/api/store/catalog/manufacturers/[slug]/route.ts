import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadManufacturerCatalogPage } from "../../catalog-helpers"

type RouteParams = { slug: string }

/**
 * GET /store/catalog/manufacturers/:slug — publieke producentprofiel + producten.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params as RouteParams
  if (!slug?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "producent-slug is verplicht."
    )
  }

  const region_code =
    typeof req.query.region_code === "string" ? req.query.region_code : "NL"

  const page = await loadManufacturerCatalogPage(
    req.scope,
    slug.trim(),
    region_code
  )
  if (!page) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Producent niet gevonden of zonder gepubliceerde producten."
    )
  }

  res.status(200).json(page)
}
