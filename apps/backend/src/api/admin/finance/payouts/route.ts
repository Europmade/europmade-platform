import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  isInFinancePeriod,
  loadAdminFinanceSnapshot,
  parseFinancePeriod,
  parseLimitOffset,
  resolveFinancePeriodRange,
  serializePayout,
} from "../admin-finance-query"

function qstr(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

/**
 * GET /admin/finance/payouts — bestaande ledger; optionele filters/paginering.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const period = parseFinancePeriod(req.query.period ?? "all_time")
  const range = resolveFinancePeriodRange(period)
  const paginate = req.query.limit != null
  const { limit, offset } = parseLimitOffset(req.query as Record<string, unknown>)
  const status = qstr(req.query.status)
  const recipientType = qstr(req.query.recipient_type)
  const sellerId = qstr(req.query.seller_id)
  const affiliateId = qstr(req.query.affiliate_id)
  const q = qstr(req.query.q)?.toLowerCase()

  const snapshot = await loadAdminFinanceSnapshot(req.scope)
  let rows = snapshot.payouts.filter((p) =>
    isInFinancePeriod(p.created_at, range)
  )
  if (status) rows = rows.filter((p) => p.status === status)
  if (recipientType) {
    rows = rows.filter((p) => p.recipient_type === recipientType)
  }
  if (sellerId) rows = rows.filter((p) => p.seller_id === sellerId)
  if (affiliateId) rows = rows.filter((p) => p.affiliate_id === affiliateId)
  if (q) {
    rows = rows.filter((p) => {
      const hay = [
        p.id,
        p.order_id,
        p.seller_id,
        p.affiliate_id,
        p.period,
        p.stripe_transfer_id,
        p.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }

  const serialized = rows.map((p) => serializePayout(snapshot, p))
  res.status(200).json({
    period: {
      key: range.key,
      label: range.label,
      from: range.from ? range.from.toISOString() : null,
      to: range.to.toISOString(),
    },
    count: serialized.length,
    limit,
    offset,
    payouts: paginate ? serialized.slice(offset, offset + limit) : serialized,
  })
}
