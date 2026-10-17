import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
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
import {
  formatProductManagerLabel,
  isRealBrandId,
  normalizeProductManagerKind,
  resolveOfferSellerIdsForProduct,
} from "../../../../../modules/product-cloud/catalog-edit-auth"
import { buildProductManagerSnapshot } from "../../../../../modules/product-cloud/product-manager-assignment"
import {
  approvedOwnerClaim,
  brandOwnerCompanyId,
  type BrandPublicRow,
} from "../../../../store/brands/ownership"
import { VARIANT_TYPES } from "../../../../../modules/product-cloud/import-columns"
import { PRODUCT_CLOUD_ACTIVE_LANGUAGES } from "../../../../../modules/product-cloud/languages"

type RouteParams = { id: string }

async function resolveSellerDisplayName(
  partner: PartnerModuleService,
  sellerId: string
): Promise<string> {
  try {
    const seller = await partner.retrieveSeller(sellerId, {
      relations: ["company"],
    })
    const company = seller.company as { legal_name?: string } | undefined
    return company?.legal_name?.trim() || sellerId
  } catch {
    return sellerId
  }
}

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
    req.scope,
    { skipSellerAccess: true }
  )
  if (!detail) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product niet gevonden."
    )
  }

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

  const pmKind = normalizeProductManagerKind(
    (product as { product_manager_kind?: string }).product_manager_kind
  )
  const pmSellerId =
    (product as { product_manager_seller_id?: string | null })
      .product_manager_seller_id || null
  const offerSellerIds = await resolveOfferSellerIdsForProduct(
    productCloud,
    commerce,
    id
  )
  const offer_sellers: Array<{ seller_id: string; label: string }> = []
  for (const sid of offerSellerIds) {
    offer_sellers.push({
      seller_id: sid,
      label: await resolveSellerDisplayName(partner, sid),
    })
  }
  let brand_id: string | null = isRealBrandId(product.brand_id)
    ? product.brand_id
    : null
  let brand_name: string | null = null
  let brand_owner: {
    seller_id: string | null
    company_id: string | null
    label: string
  } | null = null
  if (brand_id) {
    try {
      const brand = (await partner.retrieveBrand(brand_id)) as BrandPublicRow & {
        id: string
        name?: string
      }
      brand_name = brand.name?.trim() || brand_id
      const claim = await approvedOwnerClaim(partner, brand_id)
      if (claim) {
        brand_owner = {
          seller_id: claim.seller_id || null,
          company_id: claim.company_id || brandOwnerCompanyId(brand),
          label: claim.seller_id
            ? await resolveSellerDisplayName(partner, claim.seller_id)
            : brandOwnerCompanyId(brand) || "Merkeigenaar",
        }
      }
    } catch {
      brand_name = brand_id
    }
  }
  const pmSellerName =
    pmKind === "seller" && pmSellerId
      ? await resolveSellerDisplayName(partner, pmSellerId)
      : null
  const candidates: Array<{
    kind: "seller" | "brand_owner" | "none"
    seller_id: string | null
    label: string
  }> = [
    { kind: "none", seller_id: null, label: formatProductManagerLabel("none") },
  ]
  if (brand_owner && brand_id) {
    candidates.push({
      kind: "brand_owner",
      seller_id: brand_owner.seller_id,
      label: `Merkeigenaar — ${brand_name || brand_id} (${brand_owner.label})`,
    })
  }
  for (const s of offer_sellers) {
    candidates.push({
      kind: "seller",
      seller_id: s.seller_id,
      label: `Seller — ${s.label}`,
    })
  }
  const pmHistory = await productCloud.listProductFieldChanges(
    { product_id: id, field_code: "product_manager" },
    { order: { created_at: "DESC" }, take: 20 }
  )
  const product_management = {
    current: buildProductManagerSnapshot({
      kind: pmKind,
      seller_id: pmSellerId,
      seller_name: pmSellerName,
      brand_id,
      brand_name:
        pmKind === "brand_owner" && brand_owner
          ? `${brand_name || brand_id} (${brand_owner.label})`
          : brand_name,
    }),
    offer_sellers,
    brand_owner,
    brand_id,
    brand_name,
    candidates,
    history: pmHistory,
  }

  const categoryLinks = await productCloud.listProductCategories({ product_id: id })
  const categoryIds = (categoryLinks as Array<{ category_id: string }>).map(
    (row) => row.category_id
  )
  const versionId = (detail as { version_id?: string | null }).version_id
  const translations = versionId
    ? await productCloud.listProductTranslations(
        { entity_type: "product_version", entity_id: versionId },
        { take: 200 }
      )
    : []
  const [brands, manufacturers, categories] = await Promise.all([
    partner.listBrands({}, { take: 500, order: { name: "ASC" } }).catch(() => []),
    partner.listManufacturers({}, { take: 500, order: { name: "ASC" } }).catch(() => []),
    productCloud.listCategories({}, { take: 500, order: { name: "ASC" } }),
  ])

  res.json({
    product: { ...detail, category_ids: categoryIds, translations },
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
    product_management,
    catalog_choices: {
      brands: (brands as Array<{ id: string; name?: string }>).map((row) => ({
        id: row.id,
        name: row.name || row.id,
      })),
      manufacturers: (manufacturers as Array<{ id: string; name?: string }>).map((row) => ({
        id: row.id,
        name: row.name || row.id,
      })),
      categories: (
        categories as Array<{ id: string; name?: string; parent_category_id?: string | null }>
      ).map((row) => ({
        id: row.id,
        name: row.name || row.id,
        parent_id: row.parent_category_id || null,
      })),
      variant_types: [...VARIANT_TYPES],
      languages: [...PRODUCT_CLOUD_ACTIVE_LANGUAGES],
    },
  })
}
