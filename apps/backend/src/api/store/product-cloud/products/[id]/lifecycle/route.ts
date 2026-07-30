import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ownerLifecycleWorkflow } from "../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../resolve-seller"
import type { StoreOwnerLifecycleBodyInput } from "../../../validators"

type RouteParams = { id: string }

export async function POST(
  req: AuthenticatedMedusaRequest<StoreOwnerLifecycleBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  const { result } = await ownerLifecycleWorkflow(req.scope).run({
    input: {
      product_id: id,
      seller_id: seller.id,
      target_status: body.target_status,
    },
  })

  res.json({ product: result })
}
