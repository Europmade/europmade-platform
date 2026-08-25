import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  loadAdminFinanceSnapshot,
  serializePayout,
} from "../../admin-finance-query"

type Params = { id: string }

/**
 * GET /admin/finance/payouts/:id — ledger-detail (read-only).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as Params
  const snapshot = await loadAdminFinanceSnapshot(req.scope)
  const payout = snapshot.payouts.find((p) => p.id === id)
  if (!payout) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Payout niet gevonden.")
  }
  res.status(200).json({ payout: serializePayout(snapshot, payout) })
}
