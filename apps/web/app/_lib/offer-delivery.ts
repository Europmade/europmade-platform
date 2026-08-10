/**
 * Consistente levertijd-labels voor PDP Buy Box, aanbiederslijst, cart en checkout.
 * Afgeleid van bestaande Commerce Cloud offer-data (shipping_cost, voorraad, delivery_score).
 */

import { DEFAULT_STOREFRONT_LOCALE, type StorefrontLocale } from "./i18n/locales"
import { t, type StorefrontMessageKey } from "./i18n/messages"

export type OfferDeliveryLabelKey =
  | "deliveryTomorrow"
  | "deliveryOrderedToday"
  | "delivery1to2BusinessDays"
  | "delivery2to4BusinessDays"
  | "delivery5to7BusinessDays"

const DELIVERY_KEYS: OfferDeliveryLabelKey[] = [
  "deliveryTomorrow",
  "deliveryOrderedToday",
  "delivery1to2BusinessDays",
  "delivery2to4BusinessDays",
  "delivery5to7BusinessDays",
]

/** @deprecated NL-only list kept for callers that still compare raw strings. */
export const OFFER_DELIVERY_LABELS = [
  "Morgen in huis",
  "Vandaag besteld, morgen geleverd",
  "1–2 werkdagen",
  "2–4 werkdagen",
  "5–7 werkdagen",
] as const

export type OfferDeliveryLabel = (typeof OFFER_DELIVERY_LABELS)[number]

function resolveOfferDeliveryKey(input: {
  shipping_cost: number
  quantity_available: number
  delivery_score?: number | null
}): OfferDeliveryLabelKey {
  const score =
    input.delivery_score != null && Number.isFinite(Number(input.delivery_score))
      ? Number(input.delivery_score)
      : null

  if (score != null) {
    if (score >= 0.9) return "deliveryTomorrow"
    if (score >= 0.8) return "deliveryOrderedToday"
    if (score >= 0.65) return "delivery1to2BusinessDays"
    if (score >= 0.4) return "delivery2to4BusinessDays"
    return "delivery5to7BusinessDays"
  }

  const shipping = Number(input.shipping_cost) || 0
  const qty = Number(input.quantity_available) || 0

  if (shipping <= 0 && qty > 5) return "deliveryTomorrow"
  if (shipping <= 0) return "delivery1to2BusinessDays"
  if (shipping <= 4.99) return "delivery2to4BusinessDays"
  return "delivery5to7BusinessDays"
}

export function resolveOfferDeliveryLabel(
  input: {
    shipping_cost: number
    quantity_available: number
    /** Buy Box factor_scores.delivery (0–1), indien beschikbaar in ranked payload */
    delivery_score?: number | null
  },
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): string {
  const key = resolveOfferDeliveryKey(input)
  return t(key as StorefrontMessageKey, locale)
}

/** Sentinel for free shipping in offer payloads (locale-independent). */
export const FREE_SHIPPING_SENTINEL = "__FREE_SHIPPING__"

export function formatOfferShipping(
  shipping: string,
  locale: StorefrontLocale
): string {
  if (!shipping || shipping === FREE_SHIPPING_SENTINEL || shipping === "Gratis") {
    return t("freeShipping", locale)
  }
  return shipping
}

export function isFreeShippingValue(shipping: string): boolean {
  return (
    !shipping ||
    shipping === FREE_SHIPPING_SENTINEL ||
    shipping === "Gratis"
  )
}

export function defaultDeliveryLabel(locale: StorefrontLocale): string {
  return t("delivery2to4BusinessDays", locale)
}

export function localizeDeliveryLabelIfKnown(
  value: string,
  locale: StorefrontLocale
): string {
  const v = value.trim()
  if (!v || /levertijd via aanbieder/i.test(v)) {
    return defaultDeliveryLabel(locale)
  }
  const nlLegacy = OFFER_DELIVERY_LABELS.indexOf(v as OfferDeliveryLabel)
  if (nlLegacy >= 0) return t(DELIVERY_KEYS[nlLegacy], locale)
  return v
}
