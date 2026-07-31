import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeDecideModerationCase } from "../../../../../../workflows/moderation"
import type { AdminDecideModerationCaseBodyInput } from "../../../../validators"

type Params = { id: string }

/**
 * POST /admin/moderation/cases/:id/decide — Geen actie / Escaleren (F6).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminDecideModerationCaseBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as Params
  const body = req.validatedBody
  const result = await executeDecideModerationCase(req.scope, {
    case_id: id,
    decision: body.decision,
    reason: body.reason,
    actor_user_id: req.auth_context.actor_id,
  })
  res.status(200).json({ case: result.case })
}
