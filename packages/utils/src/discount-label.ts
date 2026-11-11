export type DiscountLabelKind = "discount" | "high_discount"

/**
 * Label for a real promo: regular price and current price are both known,
 * and the regular price is higher. Under or exactly 10% is "discount";
 * above 10% is "high_discount". No regular price means no label.
 */
export function discountLabelKind(
  regularCents: number | null | undefined,
  currentCents: number | null | undefined
): DiscountLabelKind | null {
  if (regularCents == null || currentCents == null) return null
  if (!Number.isFinite(regularCents) || !Number.isFinite(currentCents)) return null
  if (regularCents <= 0 || currentCents <= 0 || regularCents <= currentCents) return null
  const percent = ((regularCents - currentCents) / regularCents) * 100
  if (!(percent > 0)) return null
  return percent > 10 ? "high_discount" : "discount"
}
