/**
 * Effective sell price helpers (Commerce Cloud).
 * Regular base_price vs temporary promo_price window.
 */

export type PriceWindowInput = {
  base_price: number
  shipping_cost: number
  extra_delivery_cost?: number | null
  promo_price?: number | null
  promo_starts_at?: Date | string | null
  promo_ends_at?: Date | string | null
  now?: Date
}

export type EffectivePriceView = {
  regular_price: number
  promo_price: number | null
  promo_active: boolean
  promo_starts_at: string | null
  promo_ends_at: string | null
  unit_price: number
  shipping_cost: number
  extra_delivery_cost: number
  discount_amount: number
  discount_percent: number | null
  total_customer_price: number
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isPromoActive(input: {
  promo_price?: number | null
  promo_starts_at?: Date | string | null
  promo_ends_at?: Date | string | null
  now?: Date
}): boolean {
  if (input.promo_price == null || !Number.isFinite(Number(input.promo_price))) {
    return false
  }
  const now = input.now ?? new Date()
  const start = toDate(input.promo_starts_at)
  const end = toDate(input.promo_ends_at)
  if (start && now < start) return false
  if (end && now > end) return false
  // If only promo_price set without window → treat as active until cleared
  return true
}

export function buildEffectivePriceView(
  input: PriceWindowInput
): EffectivePriceView {
  const regular = Number(input.base_price)
  const shipping = Number(input.shipping_cost)
  const extra = Number(input.extra_delivery_cost ?? 0)
  const promoRaw =
    input.promo_price == null ? null : Number(input.promo_price)
  const start = toDate(input.promo_starts_at)
  const end = toDate(input.promo_ends_at)
  const active = isPromoActive({
    promo_price: promoRaw,
    promo_starts_at: start,
    promo_ends_at: end,
    now: input.now,
  })
  const unit = active && promoRaw != null ? promoRaw : regular
  const discount = active && promoRaw != null ? Math.max(0, regular - promoRaw) : 0
  const discount_percent =
    active && regular > 0 && discount > 0
      ? Math.round((discount / regular) * 1000) / 10
      : null

  return {
    regular_price: regular,
    promo_price: promoRaw,
    promo_active: active,
    promo_starts_at: start ? start.toISOString() : null,
    promo_ends_at: end ? end.toISOString() : null,
    unit_price: unit,
    shipping_cost: shipping,
    extra_delivery_cost: extra,
    discount_amount: discount,
    discount_percent,
    total_customer_price: unit + shipping + extra,
  }
}
