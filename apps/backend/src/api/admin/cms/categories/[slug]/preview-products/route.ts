import type { MedusaResponse } from "@medusajs/framework/http"
import { listCategoryConceptPreviewProducts } from "../../../../../../modules/cms/category-preview-products"
import { slugOf, type CatSlugReq } from "../../category-pd-http"

/**
 * GET /admin/cms/categories/:slug/preview-products
 * Admin draft preview only. Reads Concept products. Does not publish or sell them.
 */
export async function GET(req: CatSlugReq, res: MedusaResponse) {
  const products = await listCategoryConceptPreviewProducts(req.scope, slugOf(req))
  res.setHeader("Cache-Control", "private, no-store")
  res.status(200).json({ products })
}
