import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../modules/affiliate/service"
import { executeCreateCoupon } from "../../../../workflows/affiliate/workflows"
import type { StoreAffiliateCouponBodyInput } from "../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const affiliate = await aff.requireApprovedAffiliate(
    req.auth_context.actor_id
  )
  const coupons = await aff.listCoupons(
    { affiliate_id: affiliate.id },
    { order: { created_at: "DESC" }, take: 100 }
  )
  res.status(200).json({ coupons })
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreAffiliateCouponBodyInput>,
  res: MedusaResponse
) {
  const result = await executeCreateCoupon(req.scope, {
    customer_id: req.auth_context.actor_id,
    code: req.validatedBody.code,
  })
  res.status(201).json({ coupon: result.coupon })
}
