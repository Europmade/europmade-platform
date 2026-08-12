import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { resolveApprovedSeller } from "../../../../product-cloud/resolve-seller"
import { assertBrandMarketEdit } from "../../../brand-access"
import { loadBrandOrThrow } from "../../../brand-helpers"
import { StorePatchBrandMarketBody } from "../../../validators"

type RouteParams = { id: string; countryCode: string }

/**
 * PATCH /store/brands/:id/markets/:countryCode — land-specifieke merkcontent.
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id, countryCode } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  await assertBrandMarketEdit(req.scope, seller, brand, countryCode)

  const body = StorePatchBrandMarketBody.parse(req.body)
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const cc = countryCode.trim().toUpperCase()

  const existing = await partner.listBrandMarketContents(
    { brand_id: brand.id, country_code: cc },
    { take: 1 }
  )

  let row
  if (existing[0]) {
    row = await partner.updateBrandMarketContents({
      id: existing[0].id,
      ...body,
      managed_by_company_id: seller.company_id ?? undefined,
    })
  } else {
    row = await partner.createBrandMarketContents({
      brand_id: brand.id,
      country_code: cc,
      managed_by_company_id: seller.company_id ?? undefined,
      ...body,
    })
  }

  res.status(200).json({ market_content: row })
}
