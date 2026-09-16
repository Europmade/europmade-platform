/**
 * Shared return-period helpers (ADR-0040).
 * EuropMade marketplace return window: 30 calendar days from delivery.
 */

export const RETURN_PERIOD_DAYS = 30

export type ReturnPeriodInput = {
  /** Required anchor — shipment delivered_at. No deadline without delivery. */
  deliveredAt?: Date | string | null
  /** Override period length (default 30) */
  periodDays?: number
  now?: Date
}

export type ReturnPeriod = {
  anchor_at: string | null
  anchor_source: "delivered_at" | null
  period_days: number
  deadline_at: string | null
  days_remaining: number | null
  is_open: boolean
  delivered_at: string | null
  starts_after_delivery: boolean
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  )
}

/**
 * Return window only starts once the order is delivered.
 * Without deliveredAt there is no deadline (UI shows —).
 */
export function computeReturnPeriod(input: ReturnPeriodInput): ReturnPeriod {
  const periodDays = input.periodDays ?? RETURN_PERIOD_DAYS
  const now = input.now ?? new Date()
  const deliveredAt = input.deliveredAt ? toDate(input.deliveredAt) : null

  if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) {
    return {
      anchor_at: null,
      anchor_source: null,
      period_days: periodDays,
      deadline_at: null,
      days_remaining: null,
      is_open: false,
      delivered_at: null,
      starts_after_delivery: true,
    }
  }

  const deadline = new Date(deliveredAt)
  deadline.setUTCDate(deadline.getUTCDate() + periodDays)

  const remainingMs =
    startOfUtcDay(deadline).getTime() - startOfUtcDay(now).getTime()
  const daysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000))

  return {
    anchor_at: deliveredAt.toISOString(),
    anchor_source: "delivered_at",
    period_days: periodDays,
    deadline_at: deadline.toISOString(),
    days_remaining: daysRemaining,
    is_open: now.getTime() <= deadline.getTime(),
    delivered_at: deliveredAt.toISOString(),
    starts_after_delivery: false,
  }
}

/** @deprecated use computeReturnPeriod — kept for call-site migration */
export function resolveReturnAnchor(input: {
  deliveredAt?: Date | string | null
  orderCreatedAt?: Date | string
}): { anchor: Date | null; source: "delivered_at" | null } {
  if (input.deliveredAt) {
    return { anchor: toDate(input.deliveredAt), source: "delivered_at" }
  }
  return { anchor: null, source: null }
}
