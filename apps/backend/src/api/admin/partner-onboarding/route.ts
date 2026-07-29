import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../modules/partner"
import PartnerModuleService from "../../../modules/partner/service"
import { ONBOARDING_STATUS } from "../../../workflows/partner-onboarding"
import { AdminListPartnerOnboardingQuery } from "./validators"

const QUEUE_STATUSES = [
  ONBOARDING_STATUS.INGEDIEND,
  ONBOARDING_STATUS.IN_BEOORDELING,
  ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST,
] as const

/**
 * Reviewer-overzicht (S3-02-05) — tabs Alle / Aanvragen / Actief uit
 * wireframe partner-01. ANDERS dan GET /admin/partners (S3-02-04,
 * uitsluitend Goedgekeurd, partner-center/spec.md).
 *
 * - queue  = Aanvragen (Ingediend / In beoordeling / Aanvullende info)
 * - active = Actief (Goedgekeurd én niet geblokkeerd)
 * - all    = Alles behalve Concept (nooit-ingediende concepten horen
 *            niet in een reviewer-overzicht)
 * - blocked = Geblokkeerde goedgekeurde partners
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

  const filtered = sellers.filter((seller) => {
    if (seller.onboarding_status === ONBOARDING_STATUS.CONCEPT) {
      return false
    }

    if (query.tab === "queue") {
      if (
        !(QUEUE_STATUSES as readonly string[]).includes(seller.onboarding_status)
      ) {
        return false
      }
    } else if (query.tab === "active") {
      if (
        seller.onboarding_status !== ONBOARDING_STATUS.GOEDGEKEURD ||
        seller.is_blocked
      ) {
        return false
      }
    } else if (query.tab === "blocked") {
      if (!seller.is_blocked) {
        return false
      }
    }

    if (countryFilter && seller.company?.country_code !== countryFilter) {
      return false
    }
    if (search) {
      const haystack = `${seller.company?.legal_name ?? ""} ${
        seller.company?.chamber_of_commerce_number ?? ""
      }`.toLowerCase()
      if (!haystack.includes(search)) {
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

  res.json({
    partners: page.map((seller) => ({
      id: seller.id,
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      is_distributor: seller.is_distributor,
      onboarding_status: seller.onboarding_status,
      is_blocked: seller.is_blocked,
      approved_at: seller.approved_at,
      created_at: seller.created_at,
      updated_at: seller.updated_at,
      company: seller.company
        ? {
            legal_name: seller.company.legal_name,
            chamber_of_commerce_number:
              seller.company.chamber_of_commerce_number,
            country_code: seller.company.country_code,
          }
        : null,
    })),
    count,
    limit: query.limit,
    offset: query.offset,
  })
}
