import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../modules/partner"
import PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { ONBOARDING_STATUS } from "../../../workflows/partner-onboarding"
import { AdminListPartnerOnboardingQuery } from "./validators"
import {
  buildCustomerEmailIndex,
  contactPersonLabel,
  countProductsBySeller,
  resolveSellerContact,
  sellerMadeInEuropeStatusLabel,
  sellerVerificationStatusLabel,
} from "./seller-enrichment"

const QUEUE_STATUSES = [
  ONBOARDING_STATUS.INGEDIEND,
  ONBOARDING_STATUS.IN_BEOORDELING,
  ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST,
] as const

/**
 * Reviewer-overzicht (S3-02-05 + P2.19 Seller Management).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const parsed = AdminListPartnerOnboardingQuery.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({
      message: "Ongeldige queryparameters.",
      errors: parsed.error.flatten(),
    })
    return
  }
  const query = parsed.data
  const partnerService = req.scope.resolve<PartnerModuleService>(PARTNER_MODULE)
  let productCloud: ProductCloudModuleService | null = null
  try {
    productCloud = req.scope.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
  } catch {
    productCloud = null
  }

  const roleFilter: Record<string, boolean> = {}
  if (query.is_retailer !== undefined) {
    roleFilter.is_retailer = query.is_retailer === "true"
  }
  if (query.is_producer_or_brand_owner !== undefined) {
    roleFilter.is_producer_or_brand_owner =
      query.is_producer_or_brand_owner === "true"
  }
  if (query.is_distributor !== undefined) {
    roleFilter.is_distributor = query.is_distributor === "true"
  }

  const sellers = await partnerService.listSellers(roleFilter, {
    relations: ["company"],
  })

  const search = query.q?.toLowerCase()
  const countryFilter = query.country_code?.toUpperCase()

  const emailIndex =
    search && search.includes("@")
      ? await buildCustomerEmailIndex(
          req.scope,
          sellers.map((s) => s.customer_id)
        )
      : new Map<string, string>()

  const productCounts = productCloud
    ? await countProductsBySeller(productCloud)
    : new Map<string, number>()

  const filtered = sellers.filter((seller) => {
    if (seller.onboarding_status === ONBOARDING_STATUS.CONCEPT) {
      return false
    }

    if (query.status) {
      if (seller.onboarding_status !== query.status) return false
    } else if (query.tab === "queue") {
      if (
        !(QUEUE_STATUSES as readonly string[]).includes(seller.onboarding_status)
      ) {
        return false
      }
    } else if (query.tab === "active") {
      if (seller.onboarding_status !== ONBOARDING_STATUS.GOEDGEKEURD) {
        return false
      }
    }

    if (countryFilter && seller.company?.country_code !== countryFilter) {
      return false
    }
    if (search) {
      const idMatch = seller.id.toLowerCase().includes(search)
      const emailMatch =
        emailIndex.get(seller.customer_id)?.includes(search) ?? false
      const haystack = `${seller.company?.legal_name ?? ""} ${
        seller.company?.chamber_of_commerce_number ?? ""
      } ${seller.id}`.toLowerCase()
      if (!idMatch && !emailMatch && !haystack.includes(search)) {
        return false
      }
    }
    return true
  })

  filtered.sort((a, b) => {
    const aDate = new Date(a.updated_at ?? a.created_at).getTime()
    const bDate = new Date(b.updated_at ?? b.created_at).getTime()
    return bDate - aDate
  })

  const count = filtered.length
  const page = filtered.slice(query.offset, query.offset + query.limit)

  const contactCache = new Map<string, Awaited<ReturnType<typeof resolveSellerContact>>>()

  const partners = []
  for (const seller of page) {
    let contact = contactCache.get(seller.customer_id)
    if (!contact) {
      contact = await resolveSellerContact(req.scope, seller.customer_id)
      contactCache.set(seller.customer_id, contact)
    }
    const hasProductionProof = !!seller.production_proof_file_id
    partners.push({
      id: seller.id,
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      is_distributor: seller.is_distributor,
      onboarding_status: seller.onboarding_status,
      approved_at: seller.approved_at,
      created_at: seller.created_at,
      updated_at: seller.updated_at,
      contact_person: contactPersonLabel(contact),
      contact_email: contact.email,
      product_count: productCounts.get(seller.id) ?? 0,
      verification_status: sellerVerificationStatusLabel(
        seller.onboarding_status
      ),
      made_in_europe_status: sellerMadeInEuropeStatusLabel(
        seller.onboarding_status,
        hasProductionProof
      ),
      company: seller.company
        ? {
            legal_name: seller.company.legal_name,
            chamber_of_commerce_number:
              seller.company.chamber_of_commerce_number,
            country_code: seller.company.country_code,
          }
        : null,
    })
  }

  res.json({
    partners,
    count,
    limit: query.limit,
    offset: query.offset,
  })
}
