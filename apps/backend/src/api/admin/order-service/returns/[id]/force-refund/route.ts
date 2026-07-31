import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { forceRefundWorkflow } from "../../../../../../workflows/order-service"
import type { AdminForceRefundBodyInput } from "../../../../../store/order-service/validators"

type RouteParams = { id: string }

/** Beheerder: Refund forceren met verplichte reden (ADR-0023). */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminForceRefundBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const { result } = await forceRefundWorkflow(req.scope).run({
    input: {
      return_id: id,
      admin_user_id: req.auth_context.actor_id,
      force_reason: req.validatedBody.force_reason,
    },
  })
  res.json(result)
}
