import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadBrandCatalogPage } from "../../brand-catalog"
import { storefrontLocaleToMarketCountry } from "../../../brands/brand-access"

type RouteParams = { slug: string }

/**
 * GET /store/catalog/brands/:slug — publiek merkprofiel + faciliteiten + producten.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params as RouteParams
  if (!slug?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "merk-slug is verplicht."
    )
  }

  const region_code =
    typeof req.query.region_code === "string" ? req.query.region_code : "NL"
  const market_country =
    typeof req.query.market_country === "string"
      ? req.query.market_country
      : typeof req.query.locale === "string"
        ? storefrontLocaleToMarketCountry(req.query.locale)
        : region_code

  const page = await loadBrandCatalogPage(req.scope, slug.trim(), {
    region_code,
    market_country,
  })
  if (!page) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Merk niet gevonden of zonder gepubliceerde producten."
    )
  }

  res.status(200).json(page)
}
