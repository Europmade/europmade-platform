import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  buildFinanceTransactions,
  buildSellerFinanceRows,
  filterFinanceTransactions,
  loadAdminFinanceSnapshot,
  parseFinancePeriod,
  resolveFinancePeriodRange,
  serializePayout,
} from "../../admin-finance-query"

type Params = { id: string }

/**
 * GET /admin/finance/sellers/:id — finance-detail voor bestaande seller.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as Params
  const period = parseFinancePeriod(req.query.period)
  const range = resolveFinancePeriodRange(period)
  const snapshot = await loadAdminFinanceSnapshot(req.scope)
  const row = buildSellerFinanceRows(snapshot, range).find(
    (s) => s.seller_id === id
  )
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Seller niet gevonden.")
  }
  const transactions = filterFinanceTransactions(
    buildFinanceTransactions(snapshot),
    { range, seller_id: id }
  )
  const payouts = snapshot.payouts
    .filter((p) => p.seller_id === id)
    .map((p) => serializePayout(snapshot, p))

  res.status(200).json({
    period: {
      key: range.key,
      label: range.label,
      from: range.from ? range.from.toISOString() : null,
      to: range.to.toISOString(),
    },
    seller: row,
    payouts,
    transactions: transactions.slice(0, 50),
  })
}
