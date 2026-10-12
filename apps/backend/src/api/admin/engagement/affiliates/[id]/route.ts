import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../../modules/affiliate/service"
import { presentAffiliateDossier } from "../../affiliate-dossier"
import { recordBody } from "../../cms-request"
import { appendPreferenceAudits, planPreferenceAudits } from "../../../../../modules/engagement/preference-audit"

function affiliateId(req: AuthenticatedMedusaRequest): string {
  const id = req.params.id?.trim() ?? ""
  if (!id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Affiliate partner vereist een id.")
  return id
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const affiliate = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  try {
    const row = await affiliate.retrieveAffiliate(affiliateId(req))
    res.status(200).json({ partner: await presentAffiliateDossier(req.scope, row) })
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Affiliate partner niet gevonden.")
  }
}

/** POST — alleen het communicatieprofiel. Status, commissie en links blijven de brondata. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = affiliateId(req)
  const affiliate = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const body = recordBody(req.body)
  const before = await affiliate.retrieveAffiliate(id)
  await affiliate.updateAffiliateProfile(id, body)
  if ("communication_preferences" in body) {
    const saved = await affiliate.retrieveAffiliate(id)
    await appendPreferenceAudits(
      req.scope,
      planPreferenceAudits({
        audience: "affiliates",
        entityId: id,
        before: (before as { communication_preferences?: unknown }).communication_preferences,
        after: (saved as { communication_preferences?: unknown }).communication_preferences,
      })
    )
  }
  const row = await affiliate.retrieveAffiliate(id)
  res.status(200).json({ partner: await presentAffiliateDossier(req.scope, row) })
}
