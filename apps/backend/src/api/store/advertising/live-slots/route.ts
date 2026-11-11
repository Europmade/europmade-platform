import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  explainAdCampaign,
  filterAdCampaignsByTarget,
  parseSellerBannerPresentation,
  resolveMediaUrl,
  selectLiveAdCampaigns,
  type AdCampaignCandidate,
  type AdVisibility,
} from "@europmade/utils"
import { normalizeMarketCode } from "@europmade/types"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

const BLOCKED = new Set(["draft", "rejected", "cancelled", "pending_review"])

type WeekRow = {
  campaign_id?: string
  market_code?: string
  week_start?: unknown
  week_end?: unknown
  created_at?: unknown
  target_value?: string | null
}

type CampaignRow = Record<string, unknown> & {
  id: string
  status?: string
  placement?: string
  target_value?: string | null
  markets?: unknown
}

function asCandidate(campaign: CampaignRow, weeks: WeekRow[]): AdCampaignCandidate {
  return {
    id: String(campaign.id),
    status: String(campaign.status ?? ""),
    placement: String(campaign.placement ?? ""),
    targetValue:
      typeof campaign.target_value === "string" ? campaign.target_value : null,
    markets: Array.isArray(campaign.markets)
      ? campaign.markets.filter((m): m is string => typeof m === "string")
      : [],
    weeks: weeks.map((week) => ({
      market_code: week.market_code,
      week_start: week.week_start,
      week_end: week.week_end,
      created_at: week.created_at,
    })),
  }
}

function toSlot(
  campaign: CampaignRow,
  origin: string,
  preview: boolean
) {
  return {
    id: campaign.id,
    source: "seller" as const,
    status: String(campaign.status ?? ""),
    name: campaign.name,
    placement: campaign.placement,
    image_url: resolveMediaUrl(
      (campaign.image_url as string | null) ?? null,
      origin
    ),
    logo_url: resolveMediaUrl(
      (campaign.logo_url as string | null) ?? null,
      origin
    ),
    headline: campaign.headline ?? null,
    subline: campaign.subline ?? null,
    destination_url: campaign.destination_url,
    product_ids: Array.isArray(campaign.product_ids)
      ? campaign.product_ids.filter((id): id is string => typeof id === "string")
      : [],
    cta_key: campaign.cta_key,
    design_key: campaign.design_key,
    banner_presentation: parseSellerBannerPresentation(
      campaign.banner_presentation
    ),
    preview,
  }
}

async function loadPlacement(
  cms: CmsModuleService,
  placement: string
): Promise<{ campaigns: CampaignRow[]; weeksByCampaign: Map<string, WeekRow[]> }> {
  const weeks = (await cms.listAdCampaignWeeks(
    { placement },
    { take: 400 }
  )) as WeekRow[]
  const weeksByCampaign = new Map<string, WeekRow[]>()
  for (const week of weeks) {
    const id = String(week.campaign_id ?? "")
    if (!id) continue
    const list = weeksByCampaign.get(id) ?? []
    list.push(week)
    weeksByCampaign.set(id, list)
  }
  const campaigns: CampaignRow[] = []
  for (const id of weeksByCampaign.keys()) {
    const rows = (await cms.listAdCampaigns({ id }, { take: 1 })) as CampaignRow[]
    if (rows[0]) campaigns.push(rows[0])
  }
  return { campaigns, weeksByCampaign }
}

export async function visibilityForCampaign(
  cms: CmsModuleService,
  campaign: CampaignRow,
  weeks: WeekRow[],
  now = new Date(),
  cache?: Map<string, { campaigns: CampaignRow[]; weeksByCampaign: Map<string, WeekRow[]> }>
): Promise<AdVisibility & { suppressed: boolean }> {
  const placement = String(campaign.placement ?? "homepage")
  let loaded = cache?.get(placement)
  if (!loaded) {
    loaded = await loadPlacement(cms, placement)
    cache?.set(placement, loaded)
  }
  const { campaigns, weeksByCampaign } = loaded
  const ownWeeks = weeksByCampaign.get(String(campaign.id)) ?? weeks
  if (!campaigns.some((row) => row.id === campaign.id)) {
    campaigns.push(campaign)
    weeksByCampaign.set(String(campaign.id), ownWeeks)
  }
  const candidates = campaigns.map((row) =>
    asCandidate(row, weeksByCampaign.get(String(row.id)) ?? [])
  )
  const visibility = explainAdCampaign(asCandidate(campaign, ownWeeks), { now })
  const markets = new Set(
    ownWeeks
      .map((week) => String(week.market_code ?? "").toUpperCase())
      .filter(Boolean)
  )
  let won = 0
  let lost = 0
  for (const market of markets) {
    const selected = selectLiveAdCampaigns(candidates, {
      now,
      placement,
      visitorMarket: market,
    })
    if (selected.live.some((row) => row.id === campaign.id)) won += 1
    else if (selected.suppressed.some((row) => row.id === campaign.id)) lost += 1
  }
  if (visibility.publicNow && won === 0 && lost > 0) {
    return {
      ...visibility,
      publicNow: false,
      reasons: ["later_booking"],
      suppressed: true,
    }
  }
  return { ...visibility, suppressed: false }
}

/**
 * GET /store/advertising/live-slots?placement=homepage&market=NL
 * GET /store/advertising/live-slots?placement=category&market=NL&target=slug
 * GET /store/advertising/live-slots?preview=adcmp_...  — read-only preview.
 * `target` limits candidates with the existing target key before winner selection.
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
  const previewId =
    typeof req.query.preview === "string" ? req.query.preview.trim() : ""
  const now = new Date()
  const origin = requestBackendOrigin(req)

  if (previewId) {
    const row = (await cms
      .retrieveAdCampaign(previewId)
      .catch(() => null)) as CampaignRow | null
    if (!row) {
      res.status(200).json({
        placement,
        market: visitorMarket,
        preview: true,
        publicNow: false,
        reasons: ["not_approved"],
        slots: [],
      })
      return
    }
    const weeks = (await cms.listAdCampaignWeeks(
      { campaign_id: row.id },
      { order: { week_start: "ASC" }, take: 400 }
    )) as WeekRow[]
    const visibility = explainAdCampaign(asCandidate(row, weeks), {
      now,
      visitorMarket,
      requestedPlacement: placement,
    })
    const blocked = BLOCKED.has(String(row.status ?? ""))
    res.status(200).json({
      placement,
      market: visitorMarket,
      preview: true,
      publicNow: visibility.publicNow,
      reasons: visibility.reasons,
      activeFrom: visibility.activeFrom,
      activeUntil: visibility.activeUntil,
      markets: visibility.markets,
      status: row.status,
      slots: blocked ? [] : [toSlot(row, origin, true)],
    })
    return
  }

  const { campaigns, weeksByCampaign } = await loadPlacement(cms, placement)
  const target = typeof req.query.target === "string" ? req.query.target : ""
  const candidates = filterAdCampaignsByTarget(
    campaigns.map((campaign) =>
      asCandidate(campaign, weeksByCampaign.get(String(campaign.id)) ?? [])
    ),
    target
  )
  const selected = selectLiveAdCampaigns(candidates, {
    now,
    placement,
    visitorMarket,
  })
  const byId = new Map(campaigns.map((campaign) => [String(campaign.id), campaign]))
  const slots = selected.live
    .map((candidate) => byId.get(candidate.id))
    .filter((campaign): campaign is CampaignRow => Boolean(campaign))
    .map((campaign) => toSlot(campaign, origin, false))

  res.status(200).json({
    placement,
    market: visitorMarket,
    preview: false,
    slots,
  })
}
