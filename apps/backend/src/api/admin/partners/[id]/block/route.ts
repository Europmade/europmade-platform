import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import PartnerModuleService from "../../../../../modules/partner/service"
import { ONBOARDING_STATUS } from "../../../../../workflows/partner-onboarding"
import { AdminBlockPartnerInput } from "../../validators"

/**
 * Partner blokkeren (S3-02-05 / wireframe partner-05).
 * Alleen toegestaan voor status Goedgekeurd. Reden verplicht.
 * Muteert niet de onboarding_status (Deel A.3-enum blijft intact).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminBlockPartnerInput>,
  res: MedusaResponse
) {
  const { id } = req.params
  const partnerService = req.scope.resolve<PartnerModuleService>(PARTNER_MODULE)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  let seller: Awaited<ReturnType<PartnerModuleService["retrieveSeller"]>>
  try {
    seller = await partnerService.retrieveSeller(id, {
      relations: ["company"],
    })
  } catch {
    res.status(404).json({ message: "Partner niet gevonden." })
    return
  }

  if (seller.onboarding_status !== ONBOARDING_STATUS.GOEDGEKEURD) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen een goedgekeurde partner kan worden geblokkeerd."
    )
  }

  if (seller.is_blocked) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze partner is al geblokkeerd."
    )
  }

  const updated = await partnerService.updateSellers({
    id: seller.id,
    is_blocked: true,
    blocked_reason: req.validatedBody.reason,
    blocked_at: new Date(),
  })

  logger.info(
    `[audit] partner geblokkeerd: seller=${seller.id} door actor=${req.auth_context.actor_id} — reason="${req.validatedBody.reason}"`
  )

  res.json({
    partner: {
      ...updated,
      company: seller.company,
    },
  })
}
