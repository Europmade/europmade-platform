import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../modules/partner"
import PartnerModuleService from "../../../modules/partner/service"
import { AdminListPartnersQuery } from "./validators"

/**
 * Partneroverzicht (S3-02-04) — partner-center/spec.md, uitsluitend lezend.
 *
 * §4/§6: "Een partner verschijnt in het Partner Center dan en slechts dan
 * wanneer de Partner Onboarding-status 'Goedgekeurd' is" — daarom hier
 * altijd hard gefilterd op `onboarding_status: "Goedgekeurd"`, ongeacht de
 * meegegeven querystring.
 *
 * §2: zoeken op bedrijfsnaam/KvK-nummer (de enige doorzoekbare tekstvelden
 * die daadwerkelijk op `company`, Deel A.2, bestaan — "contactgegevens" uit
 * de spec-tekst heeft geen kolom in het bevroren schema, zie
 * `workflows/partner-onboarding/validation.ts`), filteren op rol en land.
 *
 * §10 wijst de overige overzichtskolommen (actieve/geverifieerde producten,
 * openstaande moderatie-items, 2FA-status) toe aan Product Cloud API,
 * Verification Center en Moderation Center — geen van die modules bestaat
 * in dit sprint-stadium (S3-03-xx/S3-10-01 zijn latere tickets). Conform
 * "geen enkele aanname buiten de Blueprint" worden deze kolommen bewust
 * NIET met verzonnen/placeholder-waarden nagemaakt; ze zijn afwezig in de
 * respons totdat de bronmodule bestaat.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const parsed = AdminListPartnersQuery.safeParse(req.query)
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

  const approvedPartners = await partnerService.listSellers(
    { onboarding_status: "Goedgekeurd", is_blocked: false, ...roleFilter },
    { relations: ["company"] }
  )

  const search = query.q?.toLowerCase()
  const countryFilter = query.country_code?.toUpperCase()

  const filtered = approvedPartners.filter((seller) => {
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
    const aDate = a.approved_at ? new Date(a.approved_at).getTime() : 0
    const bDate = b.approved_at ? new Date(b.approved_at).getTime() : 0
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
      approved_at: seller.approved_at,
      company: seller.company
        ? {
            legal_name: seller.company.legal_name,
            chamber_of_commerce_number: seller.company.chamber_of_commerce_number,
            country_code: seller.company.country_code,
          }
        : null,
    })),
    count,
    limit: query.limit,
    offset: query.offset,
  })
}
