import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { decideChangeProposalWorkflow } from "../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../resolve-seller"
import type { StoreDecideChangeProposalBodyInput } from "../../../validators"

type RouteParams = { id: string }

export async function POST(
  req: AuthenticatedMedusaRequest<StoreDecideChangeProposalBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  const { result } = await decideChangeProposalWorkflow(req.scope).run({
    input: {
      proposal_id: id,
      decider_seller_id: seller.id,
      decision: body.decision,
      decision_reason: body.decision_reason,
      decider_company_id: seller.company_id ?? null,
    },
  })

  res.json(result)
}
