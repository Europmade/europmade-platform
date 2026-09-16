/**
 * Promised delivery date from order date + offer delivery estimate
 * (aligned with storefront offer-delivery categories / CMP-021).
 */

export type DeliveryEstimateCategory =
  | "tomorrow"
  | "ordered_today"
  | "1_2_business_days"
  | "2_4_business_days"
  | "5_7_business_days"

/** Upper bound of promised window in business days (seller must deliver by this). */
export const DELIVERY_CATEGORY_MAX_BUSINESS_DAYS: Record<
  DeliveryEstimateCategory,
  number
> = {
  tomorrow: 1,
  ordered_today: 1,
  "1_2_business_days": 2,
  "2_4_business_days": 4,
  "5_7_business_days": 7,
}

export function resolveDeliveryEstimateCategory(input: {
  shipping_cost: number
  quantity_available: number
  delivery_score?: number | null
}): DeliveryEstimateCategory {
  const score =
    input.delivery_score != null && Number.isFinite(Number(input.delivery_score))
      ? Number(input.delivery_score)
      : null

  if (score != null) {
    if (score >= 0.9) return "tomorrow"
    if (score >= 0.8) return "ordered_today"
    if (score >= 0.65) return "1_2_business_days"
    if (score >= 0.4) return "2_4_business_days"
    return "5_7_business_days"
  }

  const shipping = Number(input.shipping_cost) || 0
  const qty = Number(input.quantity_available) || 0
  if (shipping <= 0 && qty > 5) return "tomorrow"
  if (shipping <= 0) return "1_2_business_days"
  if (shipping <= 4.99) return "2_4_business_days"
  return "5_7_business_days"
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDateOnlyUTC(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Add N business days (Mon–Fri) starting the day after `from` (UTC calendar). */
export function addBusinessDays(from: Date | string, businessDays: number): Date {
  const d = toDate(from)
  const out = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  )
  let remaining = Math.max(0, Math.floor(businessDays))
  while (remaining > 0) {
    out.setUTCDate(out.getUTCDate() + 1)
    const day = out.getUTCDay()
    if (day !== 0 && day !== 6) remaining -= 1
  }
  return out
}

export function addCalendarDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return formatDateOnlyUTC(dt)
}

export function calendarDateInTimeZone(
  date: Date,
  timeZone = "Europe/Amsterdam"
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/**
 * Concrete promised delivery date (YYYY-MM-DD).
 * Prefer shipment.expected_delivery_at when set; else order date + max business days.
 */
export function computePromisedDeliveryDate(input: {
  orderCreatedAt: Date | string
  maxBusinessDays: number
  expectedDeliveryAt?: Date | string | null
}): string {
  if (input.expectedDeliveryAt) {
    const expected = toDate(input.expectedDeliveryAt)
    if (!Number.isNaN(expected.getTime())) {
      return formatDateOnlyUTC(expected)
    }
  }
  const days =
    Number.isFinite(input.maxBusinessDays) && input.maxBusinessDays > 0
      ? input.maxBusinessDays
      : DELIVERY_CATEGORY_MAX_BUSINESS_DAYS["2_4_business_days"]
  return formatDateOnlyUTC(addBusinessDays(input.orderCreatedAt, days))
}

export type PromisedDeliveryUrgency = "due_tomorrow" | "overdue" | null

/**
 * Operational warning for unshipped orders.
 * Compares calendar dates in the given IANA timezone (default Europe/Amsterdam).
 */
export function resolvePromisedDeliveryUrgency(input: {
  promisedDeliveryDate: string | null | undefined
  shippingStatus: string | null | undefined
  now?: Date
  timeZone?: string
}): PromisedDeliveryUrgency {
  const status = (input.shippingStatus || "pending").toLowerCase()
  if (
    status === "shipped" ||
    status === "in_transit" ||
    status === "out_for_delivery" ||
    status === "delivered"
  ) {
    return null
  }
  const promised = input.promisedDeliveryDate?.trim()
  if (!promised || !/^\d{4}-\d{2}-\d{2}$/.test(promised)) return null

  const today = calendarDateInTimeZone(
    input.now ?? new Date(),
    input.timeZone || "Europe/Amsterdam"
  )
  if (promised < today || promised === today) return "overdue"
  if (promised === addCalendarDays(today, 1)) return "due_tomorrow"
  return null
}
