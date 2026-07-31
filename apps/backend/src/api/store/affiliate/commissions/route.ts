import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeAffiliateCommissions } from "../../../../workflows/affiliate/workflows"

/**
 * GET /store/affiliate/commissions — commissielijst (S3-07-05 / affiliate-04).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await executeAffiliateCommissions(
    req.scope,
    req.auth_context.actor_id
  )
  res.status(200).json(result)
}
