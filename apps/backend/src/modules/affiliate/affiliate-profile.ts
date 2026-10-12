/**
 * Communicatieprofiel op de bestaande affiliate-rij.
 * Geen tweede partnerdatabase en geen social-API.
 */

export const AFFILIATE_PARTNER_TYPES = [
  { key: "comparison", label: "Vergelijkingswebsite" },
  { key: "review", label: "Reviewwebsite" },
  { key: "blog", label: "Blog/contentwebsite" },
  { key: "influencer", label: "Influencer" },
  { key: "creator", label: "Content creator" },
  { key: "social", label: "Social media creator" },
  { key: "news", label: "Nieuwsplatform" },
  { key: "other", label: "Overig" },
] as const

export const AFFILIATE_SOCIAL_CHANNELS = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "other", label: "Overig" },
] as const

export const AFFILIATE_PREFERENCE_KEYS = [
  "affiliate_news",
  "new_brands_products",
  "affiliate_campaigns",
  "commission_updates",
  "content_opportunities",
] as const

export const AFFILIATE_PREFERENCE_LABELS: Record<
  (typeof AFFILIATE_PREFERENCE_KEYS)[number],
  string
> = {
  affiliate_news: "Affiliate nieuws",
  new_brands_products: "Nieuwe merken en producten",
  affiliate_campaigns: "Affiliate campagnes",
  commission_updates: "Commissie- en actie-updates",
  content_opportunities: "Contentmogelijkheden",
}

export type AffiliatePreferences = Record<(typeof AFFILIATE_PREFERENCE_KEYS)[number], boolean>

export type AffiliateSocialChannel = {
  channel: (typeof AFFILIATE_SOCIAL_CHANNELS)[number]["key"]
  url: string
}

const LOCALES = ["nl", "en", "de", "fr"]

export function partnerTypeLabel(key: string | null | undefined): string {
  return AFFILIATE_PARTNER_TYPES.find((item) => item.key === key)?.label ?? "Nog niet gekozen"
}

export function socialChannelLabel(key: string | null | undefined): string {
  return AFFILIATE_SOCIAL_CHANNELS.find((item) => item.key === key)?.label ?? "Overig"
}

export function emptyAffiliatePreferences(): AffiliatePreferences {
  return {
    affiliate_news: false,
    new_brands_products: false,
    affiliate_campaigns: false,
    commission_updates: false,
    content_opportunities: false,
  }
}

export function planAffiliatePreferences(input: unknown): AffiliatePreferences {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Communicatievoorkeuren zijn onvolledig.")
  }
  const row = input as Record<string, unknown>
  const next = emptyAffiliatePreferences()
  for (const key of AFFILIATE_PREFERENCE_KEYS) {
    if (typeof row[key] !== "boolean") {
      throw new Error("Communicatievoorkeuren zijn onvolledig.")
    }
    next[key] = row[key] === true
  }
  return next
}

export function planSocialChannels(input: unknown): AffiliateSocialChannel[] {
  if (input == null) return []
  if (!Array.isArray(input)) throw new Error("Social kanalen zijn ongeldig.")
  if (input.length > 8) throw new Error("Er passen maximaal 8 social kanalen op het dossier.")
  return input.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Social kanalen zijn ongeldig.")
    const row = item as { channel?: unknown; url?: unknown }
    const channel = AFFILIATE_SOCIAL_CHANNELS.find((entry) => entry.key === row.channel)
    if (!channel) throw new Error("Dit social kanaal is nog niet beschikbaar.")
    const url = typeof row.url === "string" ? row.url.trim().slice(0, 200) : ""
    if (!url) throw new Error("Vul het kanaal of de profielnaam in.")
    return { channel: channel.key, url }
  })
}

export function planPartnerType(value: unknown): string | null {
  if (value == null || value === "") return null
  if (typeof value !== "string") throw new Error("Kies een partnertype.")
  const found = AFFILIATE_PARTNER_TYPES.find((item) => item.key === value.trim())
  if (!found) throw new Error("Kies een partnertype.")
  return found.key
}

export function planAffiliateLocale(value: unknown): string | null {
  if (value == null || value === "") return null
  const locale = typeof value === "string" ? value.trim().toLowerCase().slice(0, 2) : ""
  if (!LOCALES.includes(locale)) throw new Error("Kies een taal.")
  return locale
}

export function planContactedAt(value: unknown): string | null {
  if (value == null || value === "") return null
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new Error("Kies een contactdatum.")
  }
  return value.trim()
}

/** Percentage uit de affiliate-instelling. Geen bedrag en geen verzonnen percentage. */
export function commissionPercentLabel(percentage: number | null | undefined): string | null {
  if (percentage == null || !Number.isFinite(percentage) || percentage <= 0) return null
  const percent = percentage <= 1 ? percentage * 100 : percentage
  const rounded = Math.round(percent * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`
}
