import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../../modules/partner"
import PartnerModuleService from "../../../../modules/partner/service"
import { submitPartnerOnboardingWorkflow } from "../../../../workflows/partner-onboarding"
import { StoreSubmitPartnerOnboardingInput } from "../validators"

/**
 * Indienen — vanuit Concept (eerste keer) of Afgekeurd (opnieuw, spec §1.2).
 * Voert de volledige indieningsvalidatie uit (spec §2.10/§2.12) en zet de
 * status via Ingediend automatisch door naar In beoordeling.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreSubmitPartnerOnboardingInput>,
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

  const { result } = await submitPartnerOnboardingWorkflow(req.scope).run({
    input: {
      sellerId: seller.id,
      acceptedTerms: req.validatedBody.accepted_terms,
    },
  })

  res.json({ onboarding: result })
}
