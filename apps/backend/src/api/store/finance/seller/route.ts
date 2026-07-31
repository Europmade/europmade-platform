import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeSellerFinanceOverview } from "../../../../workflows/finance/workflows"

/**
 * GET /store/finance/seller — commissies, facturen, payouts (S3-08-02…04 API).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await executeSellerFinanceOverview(
    req.scope,
    req.auth_context.actor_id
  )
  res.status(200).json(result)
}
