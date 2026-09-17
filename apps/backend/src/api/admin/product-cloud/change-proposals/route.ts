import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"

/**
 * GET /admin/product-cloud/change-proposals
 * Default: In behandeling.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const raw = req.query?.status
  const status = Array.isArray(raw) ? raw[0] : raw
  const filter =
    !status || status === "In behandeling"
      ? { status: "In behandeling" }
      : status === "all"
        ? {}
        : { status: String(status) }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const change_proposals = await productCloud.listChangeProposals(filter, {
    order: { created_at: "DESC" },
    take: 200,
  })

  res.setHeader("Cache-Control", "no-store")
  res.json({
    change_proposals,
    count: change_proposals.length,
  })
}
