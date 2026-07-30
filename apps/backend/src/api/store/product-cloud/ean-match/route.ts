import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { matchByEanWorkflow } from "../../../../workflows/ean-matching"
import { resolveApprovedSeller } from "../resolve-seller"
import type { StoreEanMatchBodyInput } from "../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreEanMatchBodyInput>,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const body = req.validatedBody
  const { result } = await matchByEanWorkflow(req.scope).run({
    input: {
      identifier_value: body.identifier_value,
      identifier_type: body.identifier_type,
      country_scope: body.country_scope,
      draft_product_id: body.draft_product_id,
      candidate_product_ids: body.candidate_product_ids,
    },
  })
  res.json(result)
}
