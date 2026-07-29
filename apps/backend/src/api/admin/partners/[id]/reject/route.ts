import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { rejectPartnerOnboardingWorkflow } from "../../../../../workflows/partner-onboarding"
import { AdminRejectPartnerOnboardingInput } from "../../validators"

/** Afkeuren (Beheerder) — spec §1.2, verplichte reden. */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminRejectPartnerOnboardingInput>,
  res: MedusaResponse
) {
  const { id } = req.params
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const { result } = await rejectPartnerOnboardingWorkflow(req.scope).run({
    input: {
      sellerId: id,
      reason: req.validatedBody.reason,
      actor: req.auth_context.actor_id,
    },
  })

  logger.info(
    `[audit] partner afgekeurd: seller=${id} door actor=${req.auth_context.actor_id} — reason="${req.validatedBody.reason}"`
  )

  res.json({ partner: result })
}
