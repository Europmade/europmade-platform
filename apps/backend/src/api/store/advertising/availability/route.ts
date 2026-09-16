import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import {
  generateAvailableWeeks,
  resolveWeeklyPrice,
} from "../helpers"

/**
 * GET /store/advertising/availability?placement=homepage&target_type=homepage&target_value=&markets=NL,DE&weeks=12
 * Returns available weeks with per-market booking status and price.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService

  const placement =
    typeof req.query.placement === "string" ? req.query.placement : "homepage"
  const target_type =
    typeof req.query.target_type === "string" ? req.query.target_type : placement
  const target_value =
    typeof req.query.target_value === "string"
      ? req.query.target_value.trim()
      : ""
  const marketsStr =
    typeof req.query.markets === "string" ? req.query.markets : ""
  const markets = marketsStr
    .split(",")
    .map((m) => m.trim().toUpperCase())
    .filter((m) => m.length === 2)
  const weekCount = Math.min(
    Number(req.query.weeks) || 12,
    52
  )

  const weekSlots = generateAvailableWeeks(new Date(), weekCount)

  const result: Array<{
    week_start: string
    week_end: string
    markets: Record<string, { available: boolean; price: number }>
  }> = []

  for (const slot of weekSlots) {
    const marketStatus: Record<
      string,
      { available: boolean; price: number }
    > = {}
    for (const market of markets.length > 0 ? markets : ["NL"]) {
      const existing = await cms.listAdCampaignWeeks({
        placement,
        target_type,
        target_value: target_value || "",
        market_code: market,
        week_start: new Date(slot.week_start),
      })
      const booked = existing.length > 0
      const price = await resolveWeeklyPrice(
        cms,
        placement,
        target_type,
        market
      )
      marketStatus[market] = { available: !booked, price }
    }
    result.push({
      week_start: slot.week_start,
      week_end: slot.week_end,
      markets: marketStatus,
    })
  }

  res.json({ weeks: result })
}
