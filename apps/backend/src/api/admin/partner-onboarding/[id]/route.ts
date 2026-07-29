import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import PartnerModuleService from "../../../../modules/partner/service"
import { ONBOARDING_STATUS } from "../../../../workflows/partner-onboarding"

/**
 * Reviewer-detail (S3-02-05) — aanvraag of goedgekeurde partner.
 * Concept wordt niet getoond. Geen lifecycle/blokkeer-velden (ADR-0006).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
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
    res.status(404).json({ message: "Partneraanvraag niet gevonden." })
    return
  }

  if (seller.onboarding_status === ONBOARDING_STATUS.CONCEPT) {
    res.status(404).json({ message: "Partneraanvraag niet gevonden." })
    return
  }

  logger.info(
    `[audit] partner-onboarding detail geopend: seller=${seller.id} door actor=${req.auth_context.actor_id}`
  )

  res.json({
    partner: {
      id: seller.id,
      customer_id: seller.customer_id,
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      is_distributor: seller.is_distributor,
      onboarding_status: seller.onboarding_status,
      approved_at: seller.approved_at,
      review_note: seller.review_note,
      created_at: seller.created_at,
      updated_at: seller.updated_at,
      company: seller.company,
      documents: {
        identity_document_file_id: seller.identity_document_file_id,
        chamber_of_commerce_extract_file_id:
          seller.chamber_of_commerce_extract_file_id,
        production_proof_file_id: seller.production_proof_file_id,
        authorization_proof_file_id: seller.authorization_proof_file_id,
        additional_certifications_file_id:
          seller.additional_certifications_file_id,
      },
    },
  })
}
