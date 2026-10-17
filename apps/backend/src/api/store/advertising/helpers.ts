import {
  parseSellerBannerPresentation,
  resolveMediaUrl,
} from "@europmade/utils"
import type CmsModuleService from "../../../modules/cms/service"

/** Default weekly prices (used when no admin pricing rule exists). */
const DEFAULT_PRICES: Record<string, number> = {
  homepage: 995,
  category: 395,
  search: 149,
}

/**
 * Normalize a date string to the Monday 00:00 UTC of that ISO week.
 */
export function normalizeWeekStart(dateStr: string): Date | null {
  const d = new Date(dateStr)
  if (!Number.isFinite(d.getTime())) return null
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** Sunday 23:59:59 of the same week. */
export function computeWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + 6)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

/**
 * Resolve weekly price from admin pricing rules, falling back to defaults.
 * Priority: placement+market+target > placement+market+* > placement+*+* > default.
 */
export async function resolveWeeklyPrice(
  cms: CmsModuleService,
  placement: string,
  targetType: string,
  marketCode: string
): Promise<number> {
  const rules = await cms.listAdPricings(
    { placement, is_active: true },
    { take: 100 }
  )

  // Exact match
  const exact = rules.find(
    (r: Record<string, unknown>) =>
      r.market_code === marketCode && r.target_type === targetType
  )
  if (exact) return Number(exact.weekly_price)

  // Market + wildcard target
  const marketWild = rules.find(
    (r: Record<string, unknown>) =>
      r.market_code === marketCode && r.target_type === "*"
  )
  if (marketWild) return Number(marketWild.weekly_price)

  // Wildcard market + exact target
  const wildMarket = rules.find(
    (r: Record<string, unknown>) =>
      r.market_code === "*" && r.target_type === targetType
  )
  if (wildMarket) return Number(wildMarket.weekly_price)

  // Full wildcard
  const full = rules.find(
    (r: Record<string, unknown>) =>
      r.market_code === "*" && r.target_type === "*"
  )
  if (full) return Number(full.weekly_price)

  return DEFAULT_PRICES[placement] ?? 0
}

/**
 * Compute total price for a campaign across markets × weeks.
 */
export async function computeCampaignPrice(
  cms: CmsModuleService,
  placement: string,
  targetType: string,
  markets: string[],
  weekStarts: Date[]
): Promise<number> {
  let total = 0
  for (const market of markets) {
    const weeklyPrice = await resolveWeeklyPrice(
      cms,
      placement,
      targetType,
      market
    )
    total += weeklyPrice * weekStarts.length
  }
  return total
}

/** Generate ISO week range labels. */
export function generateAvailableWeeks(
  fromDate: Date,
  count: number
): Array<{ week_start: string; week_end: string }> {
  const start = normalizeWeekStart(fromDate.toISOString())
  if (!start) return []
  // If the current week has already started, start from next Monday
  if (start < new Date()) {
    start.setUTCDate(start.getUTCDate() + 7)
  }
  const weeks = []
  for (let i = 0; i < count; i++) {
    const ws = new Date(start)
    ws.setUTCDate(ws.getUTCDate() + i * 7)
    const we = computeWeekEnd(ws)
    weeks.push({
      week_start: ws.toISOString(),
      week_end: we.toISOString(),
    })
  }
  return weeks
}

export function serializeCampaign(
  campaign: Record<string, unknown>,
  weeks: Array<Record<string, unknown>>,
  backendOrigin = "http://localhost:9000"
) {
  return {
    id: campaign.id,
    seller_id: campaign.seller_id,
    name: campaign.name,
    placement: campaign.placement,
    target_type: campaign.target_type,
    target_value: campaign.target_value,
    markets: campaign.markets,
    image_url: resolveMediaUrl(
      (campaign.image_url as string | null) ?? null,
      backendOrigin
    ),
    logo_url: resolveMediaUrl(
      (campaign.logo_url as string | null) ?? null,
      backendOrigin
    ),
    banner_presentation: parseSellerBannerPresentation(
      campaign.banner_presentation
    ),
    destination_url: campaign.destination_url,
    headline: campaign.headline,
    subline: campaign.subline,
    cta_key: campaign.cta_key,
    design_key: campaign.design_key,
    product_ids: Array.isArray(campaign.product_ids)
      ? campaign.product_ids
      : [],
    campaign_slug: campaign.campaign_slug ?? null,
    seller_public_slug: campaign.seller_public_slug ?? null,
    status: campaign.status,
    total_price: Number(campaign.total_price),
    admin_note: campaign.admin_note,
    created_at: campaign.created_at,
    updated_at: campaign.updated_at,
    weeks: weeks.map((w) => ({
      id: w.id,
      market_code: w.market_code,
      week_start: w.week_start,
      week_end: w.week_end,
      week_price: Number(w.week_price),
    })),
  }
}

/** Public path for campaign landing (no host). */
export function buildCampaignDestinationPath(
  sellerPublicSlug: string,
  campaignSlug: string
): string {
  return `/seller/${encodeURIComponent(sellerPublicSlug)}/campaign/${encodeURIComponent(campaignSlug)}`
}

export function slugifyAdvertising(input: string): string {
  const base = String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return base || "campaign"
}
