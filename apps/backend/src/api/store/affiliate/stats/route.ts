import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeAffiliateDashboard } from "../../../../workflows/affiliate/workflows"

/**
 * GET /store/affiliate/stats — per-link statistieken (S3-07-05 / affiliate-03).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await executeAffiliateDashboard(
    req.scope,
    req.auth_context.actor_id
  )
  res.status(200).json({
    period_days: result.period_days,
    link_stats: result.link_stats,
  })
}
