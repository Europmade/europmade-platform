import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import PartnerModuleService from "../../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../../../modules/verification"
import type VerificationModuleService from "../../../../modules/verification/service"
import { serializePartnerAccess } from "../../../../modules/partner/permissions"
import { ONBOARDING_STATUS } from "../../../../workflows/partner-onboarding"
import {
  loadSellerProductSummary,
  resolveSellerContact,
  sellerMadeInEuropeStatusLabel,
  sellerVerificationStatusLabel,
} from "../seller-enrichment"
import { AUDIT_MODULE } from "../../../../modules/audit"
import type AuditModuleService from "../../../../modules/audit/service"

/**
 * Reviewer-detail (S3-02-05 + P2.19 Seller Review Center).
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

  const contact = await resolveSellerContact(req.scope, seller.customer_id)
  const hasProductionProof = !!seller.production_proof_file_id

  let productSummary = {
    total: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0,
    pending_evidence: 0,
  }
  let productCloud: ProductCloudModuleService | null = null
  let verification: VerificationModuleService | null = null
  try {
    productCloud = req.scope.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
  } catch {
    productCloud = null
  }
  try {
    verification = req.scope.resolve(
      VERIFICATION_MODULE
    ) as VerificationModuleService
  } catch {
    verification = null
  }
  if (productCloud) {
    productSummary = await loadSellerProductSummary(
      productCloud,
      verification,
      seller.id
    )
  }

  let auditEntries: Array<{
    id: string
    action_type: string
    reason: string | null
    created_at: string
    actor_customer_id: string | null
  }> = []
  try {
    const audit = req.scope.resolve(AUDIT_MODULE) as AuditModuleService
    const rows = await audit.listAuditLogs(
      { entity_type: "seller", entity_id: seller.id },
      { order: { created_at: "DESC" }, take: 20 }
    )
    auditEntries = rows.map((r) => ({
      id: r.id,
      action_type: r.action_type,
      reason: r.reason ?? null,
      created_at: String(r.created_at),
      actor_customer_id: r.actor_customer_id ?? null,
    }))
  } catch {
    auditEntries = []
  }

  const company = seller.company as
    | {
        id: string
        legal_name: string
        chamber_of_commerce_number: string
        vat_number: string | null
        country_code: string
        iban: string
      }
    | null
    | undefined

  let manufacturers: Array<{
    id: string
    name: string
    country_code: string | null
    city: string | null
    contact_email: string | null
  }> = []
  if (company?.id) {
    try {
      const rows = await partnerService.listManufacturers(
        { represented_by_company_id: company.id },
        { take: 50 }
      )
      manufacturers = rows.map((m) => ({
        id: m.id,
        name: m.name,
        country_code: m.country_code ?? null,
        city: m.city ?? null,
        contact_email: m.contact_email ?? null,
      }))
    } catch {
      manufacturers = []
    }
  }

  res.json({
    partner: {
      id: seller.id,
      customer_id: seller.customer_id,
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      is_distributor: seller.is_distributor,
      ...serializePartnerAccess(seller),
      onboarding_status: seller.onboarding_status,
      approved_at: seller.approved_at,
      review_note: seller.review_note,
      created_at: seller.created_at,
      updated_at: seller.updated_at,
      contact,
      verification_status: sellerVerificationStatusLabel(
        seller.onboarding_status
      ),
      made_in_europe_status: sellerMadeInEuropeStatusLabel(
        seller.onboarding_status,
        hasProductionProof
      ),
      product_summary: productSummary,
      audit_log: auditEntries,
      company: company
        ? {
            id: company.id,
            legal_name: company.legal_name,
            chamber_of_commerce_number: company.chamber_of_commerce_number,
            vat_number: company.vat_number,
            country_code: company.country_code,
            iban: company.iban,
          }
        : null,
      manufacturers,
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
