import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { decideClaimWorkflow } from "../../../../../../workflows/product-cloud"
import type { AdminDecideClaimBodyInput } from "../../../validators"

type RouteParams = { id: string }

export async function POST(
  req: AuthenticatedMedusaRequest<AdminDecideClaimBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  const { result } = await decideClaimWorkflow(req.scope).run({
    input: {
      claim_id: id,
      decision: body.decision,
      decision_reason: body.decision_reason,
    },
  })

  res.json({ claim: result })
}
