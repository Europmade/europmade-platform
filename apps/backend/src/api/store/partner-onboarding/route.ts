import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../modules/partner"
import PartnerModuleService from "../../../modules/partner/service"
import {
  startPartnerOnboardingWorkflow,
  updatePartnerOnboardingDraftWorkflow,
} from "../../../workflows/partner-onboarding"
import {
  StoreStartPartnerOnboardingInput,
  StoreUpdatePartnerOnboardingDraftInput,
} from "./validators"

/** Eigen onboardingaanvraag opvragen — spec §2.2 stap 7 ("Statuspagina"), API-niveau. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const partnerService = req.scope.resolve<PartnerModuleService>(PARTNER_MODULE)
  const customerId = req.auth_context.actor_id

  const [seller] = await partnerService.listSellers(
    { customer_id: customerId },
    { relations: ["company"] }
  )

  if (!seller) {
    res.status(404).json({ onboarding: null })
    return
  }

  res.json({ onboarding: seller })
}

/**
 * Partner Onboarding starten — spec §2.2 stap 1/2 ("Welkom" + "Partner
 * kiezen"). Server-side e-mailverificatie-gate (spec §1.8) en meervoudige
 * rolselectie (spec §1.1) worden binnen de workflow afgedwongen.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreStartPartnerOnboardingInput>,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const authIdentityId = req.auth_context.auth_identity_id

  const { result } = await startPartnerOnboardingWorkflow(req.scope).run({
    input: {
      customerId,
      authIdentityId,
      roles: {
        is_retailer: req.validatedBody.is_retailer,
        is_producer_or_brand_owner: req.validatedBody.is_producer_or_brand_owner,
        is_distributor: req.validatedBody.is_distributor,
      },
    },
  })

  res.status(201).json({ onboarding: result })
}

/**
 * Concept (of "Aanvullende informatie vereist") bijwerken — spec §2.2 stap 3
 * ("Bedrijfsgegevens") + §2.11 (server-side bewaarde voortgang).
 */
export async function PATCH(
  req: AuthenticatedMedusaRequest<StoreUpdatePartnerOnboardingDraftInput>,
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

  const { result } = await updatePartnerOnboardingDraftWorkflow(req.scope).run({
    input: {
      sellerId: seller.id,
      roles: {
        is_retailer: req.validatedBody.is_retailer,
        is_producer_or_brand_owner: req.validatedBody.is_producer_or_brand_owner,
        is_distributor: req.validatedBody.is_distributor,
      },
      company: req.validatedBody.company,
    },
  })

  res.json({ onboarding: result })
}
