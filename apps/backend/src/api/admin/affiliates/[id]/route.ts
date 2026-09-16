import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../modules/affiliate/service"
import { toAdminAffiliate } from "../serialize"

type Params = { id: string }

/**
 * GET /admin/affiliates/:id — bestaande affiliate-rij + gemaskeerd IBAN.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as Params
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  try {
    const row = await aff.retrieveAffiliate(id)
    res.status(200).json({ affiliate: await toAdminAffiliate(req.scope, row) })
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Affiliate niet gevonden."
    )
  }
}
