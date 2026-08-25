import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { FINANCE_MODULE } from "../../../../modules/finance"
import type FinanceModuleService from "../../../../modules/finance/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import {
  serializeSellerSettlement,
} from "../settlement-serialize"

/**
 * GET /admin/finance/settlements
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const finance = req.scope.resolve(FINANCE_MODULE) as FinanceModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const sellerId =
    typeof req.query.seller_id === "string" ? req.query.seller_id : null

  const rows = await finance.listSellerSettlements(
    sellerId ? { seller_id: sellerId } : {},
    { take: 200, order: { period_start: "DESC" } }
  )

  const sellers = await partner.listSellers({}, { take: 5000 })
  const nameById = new Map(sellers.map((s) => [s.id, s.id] as const))

  res.status(200).json({
    settlements: rows.map((row) => ({
      ...serializeSellerSettlement(row),
      seller_name: nameById.get(row.seller_id) ?? row.seller_id,
    })),
  })
}
