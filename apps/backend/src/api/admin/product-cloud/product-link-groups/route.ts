import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { adminProductLinkGroupListFilter } from "../../../../modules/product-cloud/product-link-groups"

/**
 * GET /admin/product-cloud/product-link-groups
 * Default: proposed queue. ?status=active|rejected|proposed|all
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const filter = adminProductLinkGroupListFilter(req.query?.status)

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product_link_groups =
    await productCloud.listSerializedProductLinkGroups(filter)

  res.setHeader("Cache-Control", "no-store")
  res.json({
    product_link_groups,
    count: product_link_groups.length,
  })
}
