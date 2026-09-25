import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../modules/affiliate/service"
import { AFFILIATE_RETURN_HOLD_DAYS } from "../../../../modules/affiliate/affiliate-hold-rules"

/**
 * GET /admin/affiliates/commission-settings
 * Platform affiliate commission rate (ADR-0030) — paid from platform margin.
 * Admin UI labels this as EuropMade affiliate contribution within the current model.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const settings = await aff.getActiveCommissionSettings()
  const pctPoints = Math.round(settings.percentage * 10000) / 100
  res.status(200).json({
    percentage: settings.percentage,
    percentage_display: `${pctPoints % 1 === 0 ? pctPoints.toFixed(0) : pctPoints}%`,
    attribution_days: settings.attribution_days,
    payout_hold_days: AFFILIATE_RETURN_HOLD_DAYS,
  })
}

type Body = {
  percentage?: number
  attribution_days?: number
}

/**
 * PUT /admin/affiliates/commission-settings
 * Updates the active platform rate. Historical commissions keep their stored percentage.
 */
export async function PUT(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const body = (req.validatedBody ?? req.body ?? {}) as Body

  const current = await aff.getActiveCommissionSettings()
  let percentage = current.percentage
  let attribution_days = current.attribution_days

  if (body.percentage != null) {
    const raw = Number(body.percentage)
    // Accept either fraction (0.03) or percent points (3)
    percentage = raw > 1 ? raw / 100 : raw
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "percentage must be between 0 and 100 (or 0–1 as fraction)."
      )
    }
  }
  if (body.attribution_days != null) {
    const days = Math.floor(Number(body.attribution_days))
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "attribution_days must be between 1 and 365."
      )
    }
    attribution_days = days
  }

  const existing = await aff.listAffiliateCommissionSettings(
    { is_active: true },
    { take: 50 }
  )
  for (const row of existing) {
    await aff.updateAffiliateCommissionSettings({
      id: row.id,
      is_active: false,
    })
  }

  const created = await aff.createAffiliateCommissionSettings({
    percentage,
    attribution_days,
    is_active: true,
  })

  const pctPoints = Math.round(Number(created.percentage) * 10000) / 100
  res.status(200).json({
    percentage: Number(created.percentage),
    percentage_display: `${pctPoints % 1 === 0 ? pctPoints.toFixed(0) : pctPoints}%`,
    attribution_days: Number(created.attribution_days),
    payout_hold_days: AFFILIATE_RETURN_HOLD_DAYS,
  })
}
