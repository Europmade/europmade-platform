import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resolveOrderExceptionWorkflow } from "../../../../../../workflows/order-service"
import type { AdminResolveExceptionBodyInput } from "../../../../../store/order-service/validators"

type RouteParams = { id: string }

/** Admin: markeer uitzondering als Afgehandeld (OMC write-scope). */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminResolveExceptionBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const { result } = await resolveOrderExceptionWorkflow(req.scope).run({
    input: {
      order_id: id,
      reason: req.validatedBody.reason,
    },
  })
  res.json(result)
}
