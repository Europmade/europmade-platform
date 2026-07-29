import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../../modules/partner"
import PartnerModuleService from "../../../../modules/partner/service"
import { submitPartnerOnboardingAdditionWorkflow } from "../../../../workflows/partner-onboarding"

/**
 * Aanvulling versturen na "Aanvullende informatie vereist" — spec §2.8A:
 * "Dient de aanvulling in via een expliciete actie ('Aanvulling versturen')
 * → status wordt Opnieuw ingediend → In beoordeling."
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const partnerService = req.scope.resolve<PartnerModuleService>(PARTNER_MODULE)
  const customerId = req.auth_context.actor_id

  const [seller] = await partnerService.listSellers({
    customer_id: customerId,
  })

  if (!seller) {
    res
      .status(404)
      .json({ message: "Geen Partner Onboarding-aanvraag gevonden voor dit account." })
    return
  }

  const { result } = await submitPartnerOnboardingAdditionWorkflow(
    req.scope
  ).run({
    input: { sellerId: seller.id },
  })

  res.json({ onboarding: result })
}
