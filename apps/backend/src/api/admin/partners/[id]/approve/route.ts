import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { approvePartnerOnboardingWorkflow } from "../../../../../workflows/partner-onboarding"

/**
 * Goedkeuren (Beheerder) — spec §1.2/§1.5. Rol(len) zijn al vastgelegd op
 * `seller` bij intake; deze actie zet de status naar "Goedgekeurd" en
 * activeert daarmee de rol(len) (RBAC-afdwinging zelf is een latere
 * ticket/laag, spec §2.13).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await approvePartnerOnboardingWorkflow(req.scope).run({
    input: { sellerId: id, actor: req.auth_context.actor_id },
  })

  res.json({ partner: result })
}
