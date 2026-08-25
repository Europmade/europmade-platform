import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  buildFinanceTransactions,
  loadAdminFinanceSnapshot,
  serializePayout,
} from "../../admin-finance-query"

type Params = { id: string }

/**
 * GET /admin/finance/transactions/:id — commission, payout of creditnota.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as Params
  const snapshot = await loadAdminFinanceSnapshot(req.scope)
  const rows = buildFinanceTransactions(snapshot)
  const row = rows.find((r) => r.id === id)
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Transactie niet gevonden.")
  }

  const payout =
    row.source === "payout"
      ? snapshot.payouts.find((p) => p.id === id)
      : snapshot.payouts.find((p) => p.order_id && p.order_id === row.order_id)
  const commissions = snapshot.commissions.filter(
    (c) => c.order_id && c.order_id === row.order_id
  )
  const refunds = snapshot.invoices.filter(
    (inv) =>
      inv.credit_of_invoice_id &&
      inv.order_id &&
      inv.order_id === row.order_id
  )

  res.status(200).json({
    transaction: row,
    payout: payout ? serializePayout(snapshot, payout) : null,
    commissions: commissions.map((c) => ({
      id: c.id,
      recipient_type: c.recipient_type,
      amount: Number(c.amount) || 0,
      percentage: Number(c.percentage) || 0,
      status: c.status,
      created_at: c.created_at,
    })),
    refunds: refunds.map((inv) => ({
      id: inv.id,
      total_amount: Number(inv.total_amount) || 0,
      issued_at: inv.issued_at,
      credit_of_invoice_id: inv.credit_of_invoice_id,
    })),
  })
}
