/**
 * Centrale EU-27 marktcatalogus voor CMS-targeting.
 * Markt ≠ locale: market = land/zichtbaarheid; locale = taal.
 * Geen GB/CH/NO — EuropMade-EU-markten alleen.
 */

export const EU_MARKET_CODES = [
  "NL",
  "BE",
  "DE",
  "FR",
  "ES",
  "IT",
  "AT",
  "PL",
  "PT",
  "SE",
  "DK",
  "FI",
  "IE",
  "GR",
  "CZ",
  "SK",
  "HU",
  "RO",
  "BG",
  "HR",
  "SI",
  "EE",
  "LV",
  "LT",
  "LU",
  "MT",
  "CY",
] as const

export type EuMarketCode = (typeof EU_MARKET_CODES)[number]

/** Alias: CMS / storefront market codes. */
export type MarketCode = EuMarketCode

export type MarketScope = "all" | "selected"

export type MarketTargeting = {
  marketScope: MarketScope
  /** Alleen relevant wanneer marketScope === "selected". */
  markets: MarketCode[]
}

/**
 * MVP-lanceringssubset (Blueprint H14.10) — blijft bestaan voor
 * legacy-typen; CMS-targeting gebruikt EU_MARKET_CODES.
 */
export type SupportedCountry = Extract<
  EuMarketCode,
  "NL" | "BE" | "DE" | "FR" | "ES" | "IT"
>

export function isEuMarketCode(value: string | null | undefined): value is EuMarketCode {
  if (!value) return false
  return (EU_MARKET_CODES as readonly string[]).includes(value.trim().toUpperCase())
}

export function normalizeMarketCode(value: string): EuMarketCode | null {
  const code = value.trim().toUpperCase()
  return isEuMarketCode(code) ? code : null
}

/**
 * Zichtbaarheid van CMS-content met market targeting.
 * marketScope "all" → alle EU-markten; "selected" → alleen listed markets.
 */
export type VisitorMarketSource = "explicit" | "cookie" | "suggestion" | "default"

/**
 * Land van de bezoeker. Taal telt niet mee.
 * Een expliciete keuze of cookie wint van een IP-voorstel.
 */
export function resolveVisitorMarket(input: {
  explicit?: string | null
  cookie?: string | null
  geoSuggestion?: string | null
  locale?: string | null
}): { market: EuMarketCode; source: VisitorMarketSource } {
  void input.locale
  const explicit = normalizeMarketCode(input.explicit ?? "")
  if (explicit) return { market: explicit, source: "explicit" }
  const cookie = normalizeMarketCode(input.cookie ?? "")
  if (cookie) return { market: cookie, source: "cookie" }
  const suggestion = normalizeMarketCode(input.geoSuggestion ?? "")
  if (suggestion) return { market: suggestion, source: "suggestion" }
  return { market: "NL", source: "default" }
}

export function isVisibleInMarket(
  targeting: MarketTargeting,
  visitorMarket: string | null | undefined
): boolean {
  if (targeting.marketScope === "all") return true
  const market = normalizeMarketCode(visitorMarket ?? "")
  if (!market) return false
  return targeting.markets.some((m) => m === market)
}
