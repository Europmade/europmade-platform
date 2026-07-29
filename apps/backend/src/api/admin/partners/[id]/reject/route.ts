import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { rejectPartnerOnboardingWorkflow } from "../../../../../workflows/partner-onboarding"
import { AdminRejectPartnerOnboardingInput } from "../../validators"

/** Afkeuren (Beheerder) — spec §1.2, verplichte reden. */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminRejectPartnerOnboardingInput>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await rejectPartnerOnboardingWorkflow(req.scope).run({
    input: {
      sellerId: id,
      reason: req.validatedBody.reason,
      actor: req.auth_context.actor_id,
    },
  })

  res.json({ partner: result })
}
