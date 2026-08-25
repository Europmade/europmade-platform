import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  buildAffiliateFinanceRows,
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
 * GET /admin/finance/affiliates — finance-aggregatie; geen attributiewijziging.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const period = parseFinancePeriod(req.query.period)
  const range = resolveFinancePeriodRange(period)
  const { limit, offset } = parseLimitOffset(req.query as Record<string, unknown>)
  const q = qstr(req.query.q)?.toLowerCase()
  const snapshot = await loadAdminFinanceSnapshot(req.scope)
  let rows = buildAffiliateFinanceRows(snapshot, range)
  if (q) {
    rows = rows.filter(
      (r) =>
        r.affiliate_id.toLowerCase().includes(q) ||
        r.affiliate_name.toLowerCase().includes(q)
    )
  }
  res.status(200).json({
    period: {
      key: range.key,
      label: range.label,
      from: range.from ? range.from.toISOString() : null,
      to: range.to.toISOString(),
    },
    count: rows.length,
    limit,
    offset,
    affiliates: rows.slice(offset, offset + limit),
  })
}
