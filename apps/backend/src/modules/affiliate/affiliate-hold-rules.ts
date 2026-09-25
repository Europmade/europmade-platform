/**
 * Affiliate payout hold & refund rules (MVP).
 * Hold is independent of seller RETURN_HOLD_DAYS (ADR-0034 seller = 14d).
 */

export const AFFILIATE_RETURN_HOLD_DAYS = 30

export function addUtcDays(from: Date, days: number): Date {
  const d = new Date(from.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** True when the affiliate retour-/risicoperiode is fully elapsed. */
export function isAffiliateCommissionPastHold(
  orderCreatedAt: Date | string,
  now: Date = new Date(),
  holdDays: number = AFFILIATE_RETURN_HOLD_DAYS
): boolean {
  const created =
    orderCreatedAt instanceof Date
      ? orderCreatedAt
      : new Date(orderCreatedAt)
  return now.getTime() >= addUtcDays(created, holdDays).getTime()
}

export function affiliateEligibleAt(
  orderCreatedAt: Date | string,
  holdDays: number = AFFILIATE_RETURN_HOLD_DAYS
): Date {
  const created =
    orderCreatedAt instanceof Date
      ? orderCreatedAt
      : new Date(orderCreatedAt)
  return addUtcDays(created, holdDays)
}

/**
 * Prorate commission after a partial refund within the hold window.
 * refundAmount and originalSubtotal use the same currency units as commission basis.
 */
export function prorateAffiliateCommission(
  originalCommission: number,
  originalSubtotal: number,
  refundAmount: number
): number {
  if (originalCommission <= 0) return 0
  if (originalSubtotal <= 0) return 0
  const refund = Math.max(0, Number(refundAmount) || 0)
  if (refund <= 0) return roundMoney(originalCommission)
  if (refund >= originalSubtotal) return 0
  const remainingRatio = (originalSubtotal - refund) / originalSubtotal
  return roundMoney(originalCommission * remainingRatio)
}

export type AffiliateRefundDisposition =
  | { action: "lock"; reason: "past_hold" }
  | { action: "full_reverse" }
  | { action: "prorate"; new_amount: number }

export function resolveAffiliateRefundDisposition(input: {
  orderCreatedAt: Date | string
  originalCommission: number
  originalSubtotal: number
  refundAmount?: number | null
  now?: Date
  holdDays?: number
}): AffiliateRefundDisposition {
  if (
    isAffiliateCommissionPastHold(
      input.orderCreatedAt,
      input.now ?? new Date(),
      input.holdDays
    )
  ) {
    return { action: "lock", reason: "past_hold" }
  }

  const refund = input.refundAmount
  if (
    refund == null ||
    !Number.isFinite(Number(refund)) ||
    Number(refund) <= 0 ||
    Number(refund) >= input.originalSubtotal
  ) {
    return { action: "full_reverse" }
  }

  const newAmount = prorateAffiliateCommission(
    input.originalCommission,
    input.originalSubtotal,
    Number(refund)
  )
  if (newAmount <= 0) return { action: "full_reverse" }
  if (newAmount >= input.originalCommission) {
    return { action: "prorate", new_amount: input.originalCommission }
  }
  return { action: "prorate", new_amount: newAmount }
}
