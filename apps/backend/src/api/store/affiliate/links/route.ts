import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../modules/affiliate/service"
import { executeCreateLink } from "../../../../workflows/affiliate/workflows"
import type { StoreAffiliateLinkBodyInput } from "../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const affiliate = await aff.requireApprovedAffiliate(
    req.auth_context.actor_id
  )
  const links = await aff.listAffiliateLinks(
    { affiliate_id: affiliate.id },
    { order: { created_at: "DESC" }, take: 100 }
  )
  res.status(200).json({ links })
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreAffiliateLinkBodyInput>,
  res: MedusaResponse
) {
  const result = await executeCreateLink(req.scope, {
    customer_id: req.auth_context.actor_id,
    target_url: req.validatedBody.target_url,
    product_id: req.validatedBody.product_id,
    offer_id: req.validatedBody.offer_id,
    seller_id: req.validatedBody.seller_id,
  })
  res.status(201).json({ link: result.link })
}
