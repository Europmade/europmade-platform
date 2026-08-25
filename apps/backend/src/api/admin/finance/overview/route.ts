import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  buildFinanceOverview,
  loadAdminFinanceSnapshot,
  parseFinancePeriod,
  resolveFinancePeriodRange,
} from "../admin-finance-query"

/**
 * GET /admin/finance/overview — KPI-aggregatie (bestaande commission/payout/order).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const period = parseFinancePeriod(req.query.period)
  const range = resolveFinancePeriodRange(period)
  const snapshot = await loadAdminFinanceSnapshot(req.scope)
  res.status(200).json(buildFinanceOverview(snapshot, range))
}
