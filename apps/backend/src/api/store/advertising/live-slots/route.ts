import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveMediaUrl } from "@europmade/utils"
import { normalizeMarketCode } from "@europmade/types"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

const BLOCKED = new Set([
  "draft",
  "rejected",
  "cancelled",
  "pending_review",
])

/**
 * GET /store/advertising/live-slots?placement=homepage&market=NL
 * Guest-read: currently booked seller campaigns for a placement (this week).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const placement =
    typeof req.query.placement === "string" && req.query.placement.trim()
      ? req.query.placement.trim()
      : "homepage"
  const marketRaw =
    typeof req.query.market === "string" ? req.query.market : ""
  const visitorMarket = normalizeMarketCode(marketRaw)
  const now = new Date()

  const weeks = await cms.listAdCampaignWeeks(
    { placement },
    { take: 400 }
  )

  const liveCampaignIds = new Set<string>()
  for (const week of weeks) {
    const start = new Date(String(week.week_start))
    const end = new Date(String(week.week_end))
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      continue
    }
    if (start > now || end < now) continue
    const market = String(week.market_code ?? "").toUpperCase()
    if (
      visitorMarket &&
      market &&
      market !== "*" &&
      market !== visitorMarket
    ) {
      continue
    }
    liveCampaignIds.add(String(week.campaign_id))
  }

  const slots: Array<Record<string, unknown>> = []
  for (const id of liveCampaignIds) {
    const rows = await cms.listAdCampaigns({ id }, { take: 1 })
    const campaign = rows[0] as Record<string, unknown> | undefined
    if (!campaign) continue
    const status = String(campaign.status ?? "")
    if (BLOCKED.has(status)) continue
    slots.push({
      id: campaign.id,
      source: "seller",
      status,
      name: campaign.name,
      placement: campaign.placement,
      image_url: resolveMediaUrl(
        (campaign.image_url as string | null) ?? null,
        requestBackendOrigin(req)
      ),
      headline: campaign.headline ?? null,
      subline: campaign.subline ?? null,
      destination_url: campaign.destination_url,
      cta_key: campaign.cta_key,
    })
  }

  res.status(200).json({
    placement,
    market: visitorMarket,
    slots,
  })
}
