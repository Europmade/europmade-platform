import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPublishedCatalogProducts } from "../catalog-helpers"

/**
 * GET /store/catalog/products — publieke lijst gepubliceerde Product Cloud-producten.
 * Guest-read (Blueprint API-model §3); geen seller-auth.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined
  const q = typeof req.query.q === "string" ? req.query.q : undefined
  const region_code =
    typeof req.query.region_code === "string" ? req.query.region_code : "NL"

  const products = await listPublishedCatalogProducts(req.scope, {
    category,
    q,
    region_code,
  })

  res.status(200).json({ products, count: products.length })
}
