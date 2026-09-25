import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { executeAffiliatePayoutSettlement } from "../../../../../../../workflows/finance/workflows"

/**
 * GET /store/finance/affiliate/payouts/:id/settlement
 * Financial afrekening for one affiliate payout (no invented VAT).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const payoutId = req.params.id
  if (!payoutId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "payout id required")
  }
  const result = await executeAffiliatePayoutSettlement(
    req.scope,
    req.auth_context.actor_id,
    payoutId
  )
  res.status(200).json(result)
}
