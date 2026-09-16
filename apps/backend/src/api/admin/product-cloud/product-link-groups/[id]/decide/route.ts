import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import type { AdminDecideProductLinkGroupBodyInput } from "../../../validators"

type RouteParams = { id: string }

/**
 * POST /admin/product-cloud/product-link-groups/:id/decide
 * approve → active, reject → rejected. Only from proposed.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminDecideProductLinkGroupBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const body = req.validatedBody
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product_link_group = await productCloud.decideProductLinkGroup(
    id,
    {
      decision: body.decision,
      decision_reason: body.decision_reason,
    },
    {
      actor_id: req.auth_context.actor_id ?? "admin",
      actor_type: (req.auth_context as { actor_type?: string }).actor_type ?? "user",
    }
  )

  res.json({ product_link_group })
}
