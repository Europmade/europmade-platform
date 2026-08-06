/**
 * Consistente levertijd-labels voor PDP Buy Box, aanbiederslijst, cart en checkout.
 * Afgeleid van bestaande Commerce Cloud offer-data (shipping_cost, voorraad, delivery_score).
 */

export const OFFER_DELIVERY_LABELS = [
  "Morgen in huis",
  "Vandaag besteld, morgen geleverd",
  "1–2 werkdagen",
  "2–4 werkdagen",
  "5–7 werkdagen",
] as const

export type OfferDeliveryLabel = (typeof OFFER_DELIVERY_LABELS)[number]

export function resolveOfferDeliveryLabel(input: {
  shipping_cost: number
  quantity_available: number
  /** Buy Box factor_scores.delivery (0–1), indien beschikbaar in ranked payload */
  delivery_score?: number | null
}): OfferDeliveryLabel {
  const score =
    input.delivery_score != null && Number.isFinite(Number(input.delivery_score))
      ? Number(input.delivery_score)
      : null

  if (score != null) {
    if (score >= 0.9) return "Morgen in huis"
    if (score >= 0.8) return "Vandaag besteld, morgen geleverd"
    if (score >= 0.65) return "1–2 werkdagen"
    if (score >= 0.4) return "2–4 werkdagen"
    return "5–7 werkdagen"
  }

  const shipping = Number(input.shipping_cost) || 0
  const qty = Number(input.quantity_available) || 0

  if (shipping <= 0 && qty > 5) return "Morgen in huis"
  if (shipping <= 0) return "1–2 werkdagen"
  if (shipping <= 4.99) return "2–4 werkdagen"
  return "5–7 werkdagen"
}
