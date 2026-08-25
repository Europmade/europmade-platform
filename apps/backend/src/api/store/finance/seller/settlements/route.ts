import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { FINANCE_MODULE } from "../../../../../modules/finance"
import type FinanceModuleService from "../../../../../modules/finance/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { serializeSellerSettlement } from "../../../../../modules/finance/serialize-settlement"

/**
 * GET /store/finance/seller/settlements — own settlements only.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const finance = req.scope.resolve(FINANCE_MODULE) as FinanceModuleService

  const [seller] = await partner.listSellers({
    customer_id: req.auth_context.actor_id,
  })
  if (!seller) {
    res.status(403).json({ message: "Not a seller" })
    return
  }

  const rows = await finance.listSellerSettlements(
    { seller_id: seller.id },
    { take: 200, order: { period_start: "DESC" } }
  )

  res.status(200).json({
    settlements: rows.map(serializeSellerSettlement),
  })
}
