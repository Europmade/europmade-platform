import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../modules/affiliate/service"

/**
 * GET /store/affiliate/commission-settings
 * Exposes the active platform default (ADR-0030) for approved affiliates.
 * No overrides — single active affiliate_commission_setting row.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  await aff.requireApprovedAffiliate(req.auth_context.actor_id)
  const settings = await aff.getActiveCommissionSettings()
  const pctPoints = Math.round(settings.percentage * 10000) / 100
  res.status(200).json({
    percentage: settings.percentage,
    percentage_display: `${pctPoints % 1 === 0 ? pctPoints.toFixed(0) : pctPoints}%`,
    attribution_days: settings.attribution_days,
  })
}
