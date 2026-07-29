import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { requestPartnerOnboardingInfoWorkflow } from "../../../../../workflows/partner-onboarding"
import { AdminRequestPartnerOnboardingInfoInput } from "../../validators"

/**
 * Aanvullende informatie vragen (Beheerder) — spec §2.8A, alternatief naast
 * Goedkeuren/Afkeuren tijdens "In beoordeling".
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminRequestPartnerOnboardingInfoInput>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await requestPartnerOnboardingInfoWorkflow(
    req.scope
  ).run({
    input: {
      sellerId: id,
      message: req.validatedBody.message,
      actor: req.auth_context.actor_id,
    },
  })

  res.json({ partner: result })
}
