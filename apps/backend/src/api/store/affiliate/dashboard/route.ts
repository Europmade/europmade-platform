import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeAffiliateDashboard } from "../../../../workflows/affiliate/workflows"

/**
 * GET /store/affiliate/dashboard — KPI's + linkstats (S3-07-05).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await executeAffiliateDashboard(
    req.scope,
    req.auth_context.actor_id
  )
  res.status(200).json(result)
}
