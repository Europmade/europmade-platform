/**
 * Storefront visitor market — onafhankelijk van locale (taal).
 *
 * Prioriteit: ?market=XX → cookie em_storefront_market → default NL.
 * Geen IP/geolocatie in Sprint 10.
 */

import { cookies, headers } from "next/headers"
import {
  isEuMarketCode,
  normalizeMarketCode,
  type EuMarketCode,
} from "@europmade/types"

export const MARKET_COOKIE = "em_storefront_market"
export const DEFAULT_STOREFRONT_MARKET: EuMarketCode = "NL"

/**
 * Resolve visitor market for CMS targeting.
 * Locale must NOT be used as market (en ≠ GB; fr+BE is valid).
 */
export async function getStorefrontMarketFromRequest(): Promise<EuMarketCode> {
  const headerStore = await headers()
  const urlMarket = headerStore.get("x-em-storefront-market")
  if (urlMarket && isEuMarketCode(urlMarket)) {
    return urlMarket.toUpperCase() as EuMarketCode
  }

  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(MARKET_COOKIE)?.value
  const normalized = normalizeMarketCode(fromCookie ?? "")
  if (normalized) return normalized

  return DEFAULT_STOREFRONT_MARKET
}

export function parseMarketSearchParam(
  value: string | string[] | undefined
): EuMarketCode | null {
  const raw = Array.isArray(value) ? value[0] : value
  return normalizeMarketCode(raw ?? "")
}
