import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { VERIFICATION_MODULE } from "../../../../../modules/verification"
import type VerificationModuleService from "../../../../../modules/verification/service"
import { buildSellerProductManagerDetail } from "../../../../store/product-cloud/product-manager"
import { loadMadeInEuropeForProduct } from "../../../../store/product-cloud/made-in-europe-helpers"
import {
  sellerMadeInEuropeStatusLabel,
  sellerVerificationStatusLabel,
} from "../../../partner-onboarding/seller-enrichment"
import {
  listSectionReviewsForProduct,
  summarizeSectionReviews,
} from "../../../../../modules/product-cloud/section-review-helpers"

type RouteParams = { id: string }

/**
 * GET /admin/product-cloud/products/:id
 * Full product view for Admin Product Review Center (P2.20).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product = await productCloud.retrieveProduct(id)
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const detail = await buildSellerProductManagerDetail(
    productCloud,
    commerce,
    id,
    product.current_owner_seller_id,
    partner,
    req.scope
  )

  const versions = await productCloud.listProductVersions({ product_id: id })
  const ownership = await productCloud.listOwnershipRecords({ product_id: id })
  const claims = await productCloud.listClaims({ product_id: id })
  const proposals = await productCloud.listChangeProposals({ product_id: id })

  let evidence: unknown[] = []
  try {
    const verification = req.scope.resolve(
      VERIFICATION_MODULE
    ) as VerificationModuleService
    evidence = await verification.listProductOriginEvidences({ product_id: id })
  } catch {
    evidence = []
  }

  let made_in_europe: unknown = null
  try {
    made_in_europe = await loadMadeInEuropeForProduct(req.scope, id)
  } catch {
    made_in_europe = null
  }

  let seller_name: string | null = product.current_owner_seller_id
  let seller_onboarding_status: string | null = null
  let seller_verification_status: string | null = null
  let seller_made_in_europe_status: string | null = null
  try {
    const seller = await partner.retrieveSeller(product.current_owner_seller_id, {
      relations: ["company"],
    })
    const company = seller.company as { legal_name?: string } | undefined
    seller_name = company?.legal_name?.trim() || seller_name
    seller_onboarding_status = seller.onboarding_status ?? null
    seller_verification_status = sellerVerificationStatusLabel(
      seller.onboarding_status
    )
    seller_made_in_europe_status = sellerMadeInEuropeStatusLabel(
      seller.onboarding_status,
      !!seller.production_proof_file_id
    )
  } catch {
    /* keep id */
  }

  const section_reviews = await listSectionReviewsForProduct(productCloud, id)
  const review_summary = summarizeSectionReviews(section_reviews)

  const can_approve =
    detail?.publication_status === "In review" &&
    review_summary.needs_info_count === 0 &&
    review_summary.rejected_count === 0
  const can_reject =
    detail?.publication_status === "In review" ||
    review_summary.rejected_count > 0
  const can_request_info = review_summary.needs_info_count > 0
  const publishable = !!detail?.completeness?.publishable
  const approval_actions = {
    approve: can_approve && publishable,
    reject: can_reject,
    request_info: can_request_info,
    request_info_reason: can_request_info
      ? ""
      : "Markeer minimaal één onderdeel als Aanvullen (met opmerking) om aanvulling te vragen.",
  }

  res.json({
    product: detail,
    identity: product,
    versions,
    ownership_records: ownership,
    claims,
    change_proposals: proposals,
    evidence,
    made_in_europe,
    seller_id: product.current_owner_seller_id,
    seller_name,
    seller_onboarding_status,
    seller_verification_status,
    seller_made_in_europe_status,
    section_reviews,
    review_summary,
    approval_actions,
    publishable,
  })
}
