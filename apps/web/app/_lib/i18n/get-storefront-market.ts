/**
 * Storefront visitor market — onafhankelijk van locale (taal).
 *
 * Prioriteit: ?market=XX → cookie em_storefront_market → IP-voorstel → default NL.
 */

import { cookies, headers } from "next/headers"
import {
  isEuMarketCode,
  normalizeMarketCode,
  resolveVisitorMarket,
  type EuMarketCode,
} from "@europmade/types"

export const MARKET_COOKIE = "em_storefront_market"
export const DEFAULT_STOREFRONT_MARKET: EuMarketCode = "NL"

/**
 * Resolve visitor market for CMS targeting and catalog delivery.
 * Locale must NOT be used as market (en ≠ GB; fr+BE is valid).
 * A geo header is only a suggestion when the visitor has not chosen a country.
 */
export async function getStorefrontMarketFromRequest(): Promise<EuMarketCode> {
  const headerStore = await headers()
  const cookieStore = await cookies()
  const resolved = resolveVisitorMarket({
    explicit: headerStore.get("x-em-storefront-market"),
    cookie: cookieStore.get(MARKET_COOKIE)?.value,
    geoSuggestion:
      headerStore.get("x-em-storefront-market-suggestion") ||
      cookieStore.get("em_storefront_market_suggestion")?.value ||
      headerStore.get("x-em-geo-country") ||
      headerStore.get("cf-ipcountry"),
  })
  return resolved.market
}

export function parseMarketSearchParam(
  value: string | string[] | undefined
): EuMarketCode | null {
  const raw = Array.isArray(value) ? value[0] : value
  return normalizeMarketCode(raw ?? "")
}
