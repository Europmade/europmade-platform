import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPublishedCatalogProducts } from "../catalog-helpers"

/**
 * GET /store/catalog/products — publieke lijst gepubliceerde Product Cloud-producten.
 * Guest-read (Blueprint API-model §3); geen seller-auth.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined
  const brand = typeof req.query.brand === "string" ? req.query.brand : undefined
  const manufacturer =
    typeof req.query.manufacturer === "string"
      ? req.query.manufacturer
      : undefined
  const country =
    typeof req.query.country === "string" ? req.query.country : undefined
  const q = typeof req.query.q === "string" ? req.query.q : undefined
  const idsRaw =
    typeof req.query.ids === "string"
      ? req.query.ids
      : Array.isArray(req.query.ids)
        ? req.query.ids.filter((v): v is string => typeof v === "string").join(",")
        : undefined
  const ids = idsRaw
    ? idsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined
  const verified =
    typeof req.query.verified === "string"
      ? req.query.verified === "true"
      : undefined
  const sort =
    typeof req.query.sort === "string" ? req.query.sort : undefined
  const price_min =
    typeof req.query.price_min === "string" ? Number(req.query.price_min) : undefined
  const price_max =
    typeof req.query.price_max === "string" ? Number(req.query.price_max) : undefined
  const offset =
    typeof req.query.offset === "string" ? Number(req.query.offset) : 0
  const limit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 24
  const region_code =
    typeof req.query.region_code === "string" ? req.query.region_code : "NL"
  const include_attributes = req.query.include_attributes === "true"

  const baseOpts = {
    category,
    q,
    ids,
    region_code,
    brand_id: brand,
    manufacturer_id: manufacturer,
    country_code: country,
    verified,
    sort: sort as
      | "popularity"
      | "price_asc"
      | "price_desc"
      | "rating_desc"
      | "name_asc"
      | "name_desc"
      | undefined,
    price_min: Number.isFinite(price_min) ? price_min : undefined,
    price_max: Number.isFinite(price_max) ? price_max : undefined,
    include_attributes,
  }

  const page = await listPublishedCatalogProducts(req.scope, {
    ...baseOpts,
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 24,
  })
  // count komt uit dezelfde scan (geen tweede limit=5000-pass).

  res.status(200).json({
    products: page.products,
    count: page.count,
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 24,
  })
}
