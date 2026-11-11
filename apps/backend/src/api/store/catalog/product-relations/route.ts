import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { listStoredProductRelations } from "../product-relation-query"

/**
 * GET /store/catalog/product-relations?from_ids=a,b
 * Stored product links only. No suggested substitutes.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw =
    typeof req.query.from_ids === "string"
      ? req.query.from_ids
      : Array.isArray(req.query.from_ids)
        ? req.query.from_ids.filter((value): value is string => typeof value === "string").join(",")
        : ""
  const fromIds = raw.split(",").map((id) => id.trim()).filter(Boolean)
  if (fromIds.length === 0) {
    res.status(200).json({ relations: [] })
    return
  }
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const relations = await listStoredProductRelations(productCloud, fromIds)
  res.status(200).json({ relations })
}
