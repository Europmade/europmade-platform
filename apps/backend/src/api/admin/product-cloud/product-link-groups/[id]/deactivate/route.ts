import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import type { AdminDeactivateProductLinkGroupBodyInput } from "../../../validators"

type RouteParams = { id: string }

/**
 * POST /admin/product-cloud/product-link-groups/:id/deactivate
 * Active → inactive; clears is_active_slot. Keeps audit fields.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminDeactivateProductLinkGroupBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product_link_group = await productCloud.deactivateProductLinkGroup(
    id,
    {
      actor_id: req.auth_context.actor_id ?? "admin",
      reason: req.validatedBody?.decision_reason,
    }
  )
  res.json({ product_link_group })
}
