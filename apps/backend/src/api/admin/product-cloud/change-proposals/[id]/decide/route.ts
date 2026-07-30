import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { decideChangeProposalWorkflow } from "../../../../../../workflows/product-cloud"
import type { AdminDecideChangeProposalBodyInput } from "../../../validators"

type RouteParams = { id: string }

/** Beheerder-escalatie — PM §9. */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminDecideChangeProposalBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  const { result } = await decideChangeProposalWorkflow(req.scope).run({
    input: {
      proposal_id: id,
      decider_seller_id: body.acting_seller_id ?? "admin",
      decision: body.decision,
      decision_reason: body.decision_reason,
      as_admin: true,
    },
  })

  res.json(result)
}
