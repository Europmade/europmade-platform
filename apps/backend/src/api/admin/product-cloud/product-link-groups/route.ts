import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"

/**
 * GET /admin/product-cloud/product-link-groups
 * Default: proposed queue. ?status=active|rejected|proposed|all
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const raw = req.query?.status
  const status = Array.isArray(raw) ? raw[0] : raw
  const filter =
    !status || status === "proposed"
      ? { status: "proposed" }
      : status === "all"
        ? {}
        : { status }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product_link_groups =
    await productCloud.listSerializedProductLinkGroups(filter)

  res.json({
    product_link_groups,
    count: product_link_groups.length,
  })
}
