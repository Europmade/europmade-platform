import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  buildFinanceTransactions,
  filterFinanceTransactions,
  loadAdminFinanceSnapshot,
  parseFinancePeriod,
  parseLimitOffset,
  resolveFinancePeriodRange,
} from "../admin-finance-query"

function qstr(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

/**
 * GET /admin/finance/transactions — unified read-model over commission + payout + creditnota.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const period = parseFinancePeriod(req.query.period)
  const range = resolveFinancePeriodRange(period)
  const { limit, offset } = parseLimitOffset(req.query as Record<string, unknown>)
  const snapshot = await loadAdminFinanceSnapshot(req.scope)
  const all = filterFinanceTransactions(buildFinanceTransactions(snapshot), {
    range,
    q: qstr(req.query.q),
    type: qstr(req.query.type),
    status: qstr(req.query.status),
    seller_id: qstr(req.query.seller_id),
    affiliate_id: qstr(req.query.affiliate_id),
  })
  res.status(200).json({
    period: {
      key: range.key,
      label: range.label,
      from: range.from ? range.from.toISOString() : null,
      to: range.to.toISOString(),
    },
    count: all.length,
    limit,
    offset,
    transactions: all.slice(offset, offset + limit),
  })
}
