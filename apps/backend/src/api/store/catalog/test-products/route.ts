import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isTestCatalogEnabled } from "@europmade/utils"
import { listTestCatalogProducts } from "../test-catalog"

/**
 * GET /store/catalog/test-products
 * Development/staging-only read of the fixed Bosch/Miele test catalog.
 * Production returns an empty list. This route is not search, a feed, or a sellable catalog.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const category = typeof req.query.category === "string" ? req.query.category : undefined
  const enabled = isTestCatalogEnabled()
  const products = enabled ? await listTestCatalogProducts(req.scope, category) : []
  res.setHeader("Cache-Control", "private, no-store")
  res.status(200).json({ enabled, products })
}
