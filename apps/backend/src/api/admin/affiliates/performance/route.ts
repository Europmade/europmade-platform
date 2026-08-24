import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  executeAdminAffiliatePerformance,
  parsePerformancePeriodDays,
} from "./aggregate"

/**
 * GET /admin/affiliates/performance
 *
 * Read-only Admin Performance Center. adminAuth verplicht.
 * Conversieratio: zie conversion_rate_definition in de response
 * (click-based, coupon-conversies niet in de teller).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const periodDays = parsePerformancePeriodDays(req.query?.period_days)
  const payload = await executeAdminAffiliatePerformance(req.scope, periodDays)
  res.status(200).json(payload)
}
