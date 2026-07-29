import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { approvePartnerOnboardingWorkflow } from "../../../../../workflows/partner-onboarding"

/**
 * Goedkeuren (Beheerder) — spec §1.2/§1.5.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const { result } = await approvePartnerOnboardingWorkflow(req.scope).run({
    input: { sellerId: id, actor: req.auth_context.actor_id },
  })

  logger.info(
    `[audit] partner goedgekeurd: seller=${id} door actor=${req.auth_context.actor_id}`
  )

  res.json({ partner: result })
}
