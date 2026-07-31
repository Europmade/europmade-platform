import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeAffiliateFinancePayouts } from "../../../../../workflows/finance/workflows"

/**
 * GET /store/finance/affiliate/payouts — affiliate-uitbetalingen (S3-08-04).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await executeAffiliateFinancePayouts(
    req.scope,
    req.auth_context.actor_id
  )
  res.status(200).json(result)
}
