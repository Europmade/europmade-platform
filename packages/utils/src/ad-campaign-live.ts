/**
 * Paid seller-banner window.
 * Weeks are Monday 00:00:00.000Z through Sunday 23:59:59.999Z.
 * A banner is public only when EuropMade approved it and a booked week covers `now`
 * for the visitor market. Preview never changes these rows.
 */

export type AdVisibilityReason =
  | "draft"
  | "pending_review"
  | "rejected"
  | "cancelled"
  | "not_approved"
  | "no_weeks"
  | "not_started"
  | "expired"
  | "outside_period"
  | "market_mismatch"
  | "placement_mismatch"
  | "later_booking"

export type SellerBannerOverlayAlign = "left" | "right"
export type SellerBannerTextColor = "white" | "black"

export type SellerBannerPresentation = {
  imagePositionX: number
  imagePositionY: number
  overlayAlign: SellerBannerOverlayAlign
  textColor: SellerBannerTextColor
  logoScale: number
}

export const DEFAULT_SELLER_BANNER_PRESENTATION: SellerBannerPresentation = {
  imagePositionX: 50,
  imagePositionY: 50,
  overlayAlign: "left",
  textColor: "white",
  logoScale: 1,
}

const PUBLIC_STATUSES = new Set(["approved", "scheduled", "active"])

export type AdWeekInput = {
  marketCode?: string | null
  market_code?: string | null
  weekStart?: unknown
  week_start?: unknown
  weekEnd?: unknown
  week_end?: unknown
  createdAt?: unknown
  created_at?: unknown
}

export type AdCampaignCandidate = {
  id: string
  status: string
  placement: string
  targetValue?: string | null
  markets?: string[]
  weeks: AdWeekInput[]
}

export type AdVisibility = {
  approved: boolean
  publicNow: boolean
  placement: string
  markets: string[]
  activeFrom: string | null
  activeUntil: string | null
  reasons: AdVisibilityReason[]
  liveMarkets: string[]
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function parseAdInstant(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isFinite(d.getTime()) ? d : null
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value.trim())
    return Number.isFinite(d.getTime()) ? d : null
  }
  return null
}

export function parseSellerBannerPresentation(
  raw: unknown
): SellerBannerPresentation {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const x = Number(source.imagePositionX)
  const y = Number(source.imagePositionY)
  const scale = Number(source.logoScale)
  const align = source.overlayAlign === "right" ? "right" : "left"
  const textColor = source.textColor === "black" ? "black" : "white"
  return {
    imagePositionX: Number.isFinite(x) ? clamp(x, 0, 100) : 50,
    imagePositionY: Number.isFinite(y) ? clamp(y, 0, 100) : 50,
    overlayAlign: align,
    textColor,
    logoScale: Number.isFinite(scale) ? clamp(scale, 0.7, 1.5) : 1,
  }
}

/** Cover keeps a 2400×600 creative's aspect ratio; position chooses the focal point. */
export function sellerBannerImageStyle(
  presentation: SellerBannerPresentation
): { objectFit: "cover"; objectPosition: string } {
  return {
    objectFit: "cover",
    objectPosition: `${presentation.imagePositionX}% ${presentation.imagePositionY}%`,
  }
}

/** Logo stays proportional. Scale changes the box, never the aspect ratio. */
export function sellerLogoFrame(scale: number): {
  objectFit: "contain"
  height: number
  maxWidth: number
} {
  const clamped = clamp(Number.isFinite(scale) ? scale : 1, 0.7, 1.5)
  return {
    objectFit: "contain",
    height: Math.round(28 * clamped),
    maxWidth: Math.round(120 * clamped),
  }
}

export function formatUtcDate(value: unknown): string | null {
  const d = parseAdInstant(value)
  if (!d) return null
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

function weekMarket(week: AdWeekInput): string {
  return String(week.marketCode ?? week.market_code ?? "")
    .trim()
    .toUpperCase()
}

function weekStart(week: AdWeekInput): Date | null {
  return parseAdInstant(week.weekStart ?? week.week_start)
}

function weekEnd(week: AdWeekInput): Date | null {
  return parseAdInstant(week.weekEnd ?? week.week_end)
}

function weekCreated(week: AdWeekInput): number {
  return (
    parseAdInstant(week.createdAt ?? week.created_at)?.getTime() ??
    weekStart(week)?.getTime() ??
    Number.MAX_SAFE_INTEGER
  )
}

function marketMatches(week: AdWeekInput, visitorMarket?: string | null): boolean {
  if (!visitorMarket) return true
  const market = weekMarket(week)
  if (!market || market === "*") return true
  return market === visitorMarket.trim().toUpperCase()
}

export function adWeekCovers(
  week: AdWeekInput,
  now: Date,
  visitorMarket?: string | null
): boolean {
  const start = weekStart(week)
  const end = weekEnd(week)
  if (!start || !end) return false
  if (now.getTime() < start.getTime() || now.getTime() > end.getTime()) return false
  return marketMatches(week, visitorMarket)
}

function statusReason(status: string): AdVisibilityReason | null {
  if (PUBLIC_STATUSES.has(status)) return null
  if (
    status === "draft" ||
    status === "pending_review" ||
    status === "rejected" ||
    status === "cancelled"
  ) {
    return status
  }
  return "not_approved"
}

function bounds(weeks: AdWeekInput[]): { from: Date | null; until: Date | null } {
  let from: Date | null = null
  let until: Date | null = null
  for (const week of weeks) {
    const start = weekStart(week)
    const end = weekEnd(week)
    if (start && (!from || start < from)) from = start
    if (end && (!until || end > until)) until = end
  }
  return { from, until }
}

export function explainAdCampaign(
  campaign: AdCampaignCandidate,
  options?: {
    now?: Date
    visitorMarket?: string | null
    requestedPlacement?: string | null
  }
): AdVisibility {
  const now = options?.now ?? new Date()
  const visitorMarket = options?.visitorMarket?.trim().toUpperCase() || null
  const weeks = Array.isArray(campaign.weeks) ? campaign.weeks : []
  const scoped = visitorMarket
    ? weeks.filter((week) => marketMatches(week, visitorMarket))
    : weeks
  const { from, until } = bounds(scoped.length > 0 ? scoped : weeks)
  const markets = Array.from(
    new Set(
      weeks
        .map(weekMarket)
        .filter((code) => code && code !== "*")
    )
  )
  const base: AdVisibility = {
    approved: PUBLIC_STATUSES.has(String(campaign.status)),
    publicNow: false,
    placement: campaign.placement,
    markets,
    activeFrom: from ? from.toISOString() : null,
    activeUntil: until ? until.toISOString() : null,
    reasons: [],
    liveMarkets: [],
  }

  const blocked = statusReason(String(campaign.status ?? ""))
  if (blocked) {
    base.reasons = [blocked]
    return base
  }
  if (
    options?.requestedPlacement &&
    options.requestedPlacement !== campaign.placement
  ) {
    base.reasons = ["placement_mismatch"]
    return base
  }
  if (weeks.length === 0) {
    base.reasons = ["no_weeks"]
    return base
  }
  if (visitorMarket && scoped.length === 0) {
    base.reasons = ["market_mismatch"]
    return base
  }

  const considered = visitorMarket ? scoped : weeks
  const live = considered.filter((week) => adWeekCovers(week, now, visitorMarket))
  base.liveMarkets = Array.from(new Set(live.map(weekMarket).filter(Boolean)))
  if (live.length > 0) {
    base.publicNow = true
    return base
  }

  const { from: windowFrom, until: windowUntil } = bounds(considered)
  if (windowUntil && now.getTime() > windowUntil.getTime()) {
    base.reasons = ["expired"]
  } else if (windowFrom && now.getTime() < windowFrom.getTime()) {
    base.reasons = ["not_started"]
  } else {
    base.reasons = ["outside_period"]
  }
  return base
}

function targetKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

export function selectLiveAdCampaigns<T extends AdCampaignCandidate>(
  campaigns: T[],
  options: {
    now: Date
    placement: string
    visitorMarket?: string | null
  }
): { live: T[]; suppressed: Array<{ id: string; winnerId: string }> } {
  const groups = new Map<string, T[]>()
  for (const campaign of campaigns) {
    const visibility = explainAdCampaign(campaign, {
      now: options.now,
      visitorMarket: options.visitorMarket,
      requestedPlacement: options.placement,
    })
    if (!visibility.publicNow) continue
    const key = `${campaign.placement}|${targetKey(campaign.targetValue)}`
    const list = groups.get(key) ?? []
    list.push(campaign)
    groups.set(key, list)
  }

  const live: T[] = []
  const suppressed: Array<{ id: string; winnerId: string }> = []
  for (const group of groups.values()) {
    const ranked = [...group].sort((a, b) => {
      const aTime = Math.min(...a.weeks.map((week) => weekCreated(week)))
      const bTime = Math.min(...b.weeks.map((week) => weekCreated(week)))
      if (aTime !== bTime) return aTime - bTime
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
    const winner = ranked[0]
    if (!winner) continue
    live.push(winner)
    for (const other of ranked.slice(1)) {
      suppressed.push({ id: other.id, winnerId: winner.id })
    }
  }
  live.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { live, suppressed }
}

/**
 * Seller creative replaces the platform banner on the same placement slot.
 * When the campaign is not live, the platform list is returned unchanged.
 */
export function mergeSellerOverPlatform<T extends { position: number }>(
  platform: T[],
  seller: T | null
): T[] {
  if (!seller) return platform
  const position = platform.some((banner) => banner.position === 1)
    ? 1
    : platform.some((banner) => banner.position === 2)
      ? 2
      : 1
  const rest = platform.filter((banner) => banner.position !== position)
  return [{ ...seller, position }, ...rest]
}
