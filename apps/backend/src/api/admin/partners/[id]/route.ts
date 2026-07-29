import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import PartnerModuleService from "../../../../modules/partner/service"

/**
 * Partnerdetail (S3-02-04) — partner-center/spec.md §3, uitsluitend lezend.
 *
 * §4: toont uitsluitend een reeds goedgekeurde partner — elke andere status
 * (of een onbekend id) levert 404 op ("Een Afgekeurde aanvraag heeft nooit
 * een partneraccount opgeleverd", dus valt buiten "bestaande partners").
 *
 * §3.3/§3.4/§3.5/§3.6/§3.7 (bedrijfsniveau-verificatiestatus, gekoppelde
 * producten, moderatie-samenvatting, audit-historielink, 2FA-status) leunen
 * op modules die in dit sprint-stadium nog niet bestaan (Verification
 * Center, Product Cloud, Moderation Center, AuditLogEntry — resp.
 * S3-03-08, S3-03-xx, S3-03-07, S3-10-01, allemaal latere tickets) en
 * worden daarom bewust weggelaten in plaats van met verzonnen waarden
 * nagemaakt — zie het implementatierapport voor de expliciete lijst.
 *
 * §7 ("Elke toegang tot partnerdetailgegevens wordt gelogd") wordt hier
 * toegepast via de bestaande, gedeelde structured logger — een eigen
 * AuditLogEntry-entiteit bestaat pas vanaf S3-10-01; dit ticket voegt geen
 * nieuwe auditstructuur toe (spec §7, laatste zin), maar herhaalt exact het
 * al bevroren logpatroon dat elders in dit domein (partner-onboarding
 * statusovergangen) al wordt gebruikt.
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
    res.status(404).json({ message: "Partner niet gevonden." })
    return
  }

  if (seller.onboarding_status !== "Goedgekeurd") {
    res.status(404).json({ message: "Partner niet gevonden." })
    return
  }

  logger.info(
    `[partner-center] partnerdetail geopend: seller=${seller.id} door actor=${req.auth_context.actor_id}`
  )

  res.json({
    partner: {
      id: seller.id,
      customer_id: seller.customer_id,
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      is_distributor: seller.is_distributor,
      approved_at: seller.approved_at,
      company: seller.company,
    },
  })
}
