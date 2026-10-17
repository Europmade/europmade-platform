import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"

/** GET /admin/product-cloud/brand-import/batches */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const batches = await productCloud.listImportBatches(
    {},
    { take: 50, order: { created_at: "DESC" } }
  )
  res.json({ batches, count: batches.length })
}
