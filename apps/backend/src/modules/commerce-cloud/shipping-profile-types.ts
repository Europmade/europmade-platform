/**
 * Seller shipping profile types (Sprint 3B 2.0).
 * Carrier/service refs are extensibility hooks — no live carrier APIs in MVP.
 */

export const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

export const DELIVERY_TIME_CODES = [
  "same_day",
  "next_day",
  "1_2",
  "2_3",
  "3_5",
  "5_plus",
] as const

export type DeliveryTimeCode = (typeof DELIVERY_TIME_CODES)[number]

export const DELIVERY_TIME_LABELS: Record<DeliveryTimeCode, string> = {
  same_day: "Zelfde werkdag",
  next_day: "Volgende werkdag",
  "1_2": "1–2 werkdagen",
  "2_3": "2–3 werkdagen",
  "3_5": "3–5 werkdagen",
  "5_plus": "Meer dan 5 werkdagen",
}

export function deliveryDaysMaxForCode(code: DeliveryTimeCode): number {
  switch (code) {
    case "same_day":
      return 0
    case "next_day":
      return 1
    case "1_2":
      return 2
    case "2_3":
      return 3
    case "3_5":
      return 5
    case "5_plus":
      return 7
    default:
      return 3
  }
}

/** Future carrier integration — stored, not resolved in MVP. */
export type CarrierRef = {
  carrier_id: string
  service_id?: string | null
}

export type HandoverDaySetting = {
  enabled: boolean
  cutoff_time: string
  processing_time_code: DeliveryTimeCode
}

export type ProcessingSettings = {
  same_for_all_weekdays: boolean
  default_handover: HandoverDaySetting
  weekdays: Partial<Record<WeekdayKey, HandoverDaySetting>>
}

export type ShippingCountryConfig = {
  active: boolean
  shipping_cost: number
  free_shipping: boolean
  free_shipping_threshold?: number | null
  delivery_time_code: DeliveryTimeCode
  delivery_days_max?: number | null
  /** 1=Mon … 7=Sun */
  delivery_weekdays?: number[]
  carrier_ref?: CarrierRef | null
}

export type ShippingProfileStatus = "draft" | "active" | "inactive"

export type ShippingProfileRecord = {
  id: string
  seller_id: string
  name: string
  description?: string | null
  status: ShippingProfileStatus
  country_rates: Record<string, ShippingCountryConfig>
  processing_settings: ProcessingSettings
  carrier_mode: "own" | "carrier"
  carrier_ref?: CarrierRef | null
  created_at?: string | Date
  updated_at?: string | Date
}

export function defaultHandoverDay(): HandoverDaySetting {
  return {
    enabled: true,
    cutoff_time: "15:00",
    processing_time_code: "next_day",
  }
}

export function defaultProcessingSettings(): ProcessingSettings {
  const base = defaultHandoverDay()
  return {
    same_for_all_weekdays: true,
    default_handover: base,
    weekdays: {
      mon: { ...base, enabled: true },
      tue: { ...base, enabled: true },
      wed: { ...base, enabled: true },
      thu: { ...base, enabled: true },
      fri: { ...base, enabled: true },
      sat: { ...base, enabled: false },
      sun: { ...base, enabled: false },
    },
  }
}

export function defaultDeliveryWeekdays(): number[] {
  return [1, 2, 3, 4, 5, 6]
}

export function defaultCountryConfig(
  shippingCost = 0
): ShippingCountryConfig {
  return {
    active: true,
    shipping_cost: shippingCost,
    free_shipping: false,
    free_shipping_threshold: null,
    delivery_time_code: "2_3",
    delivery_days_max: deliveryDaysMaxForCode("2_3"),
    delivery_weekdays: defaultDeliveryWeekdays(),
    carrier_ref: null,
  }
}

/** Normalize legacy { shipping_cost, delivery_days_max } entries. */
export function normalizeCountryConfig(
  raw: unknown
): ShippingCountryConfig | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const shipping_cost = Number(row.shipping_cost ?? 0)
  if (!Number.isFinite(shipping_cost) || shipping_cost < 0) return null
  const code = (row.delivery_time_code as DeliveryTimeCode) || "2_3"
  const delivery_days_max =
    row.delivery_days_max != null
      ? Number(row.delivery_days_max)
      : deliveryDaysMaxForCode(
          DELIVERY_TIME_CODES.includes(code as DeliveryTimeCode)
            ? (code as DeliveryTimeCode)
            : "2_3"
        )
  return {
    active: row.active !== false,
    shipping_cost,
    free_shipping: Boolean(row.free_shipping),
    free_shipping_threshold:
      row.free_shipping_threshold != null
        ? Number(row.free_shipping_threshold)
        : null,
    delivery_time_code: DELIVERY_TIME_CODES.includes(code as DeliveryTimeCode)
      ? (code as DeliveryTimeCode)
      : "2_3",
    delivery_days_max,
    delivery_weekdays: Array.isArray(row.delivery_weekdays)
      ? row.delivery_weekdays.map(Number).filter((n) => n >= 1 && n <= 7)
      : defaultDeliveryWeekdays(),
    carrier_ref:
      row.carrier_ref && typeof row.carrier_ref === "object"
        ? (row.carrier_ref as CarrierRef)
        : null,
  }
}

export function normalizeCountryRates(
  raw: Record<string, unknown> | null | undefined
): Record<string, ShippingCountryConfig> {
  if (!raw) return {}
  const out: Record<string, ShippingCountryConfig> = {}
  for (const [code, value] of Object.entries(raw)) {
    const normalized = normalizeCountryConfig(value)
    if (normalized) out[code.toUpperCase()] = normalized
  }
  return out
}

export type ShippingProfileValidationIssue = {
  field: string
  message: string
}

export function validateShippingProfileInput(input: {
  name?: string | null
  country_rates?: Record<string, ShippingCountryConfig> | null
  processing_settings?: ProcessingSettings | null
}): ShippingProfileValidationIssue[] {
  const issues: ShippingProfileValidationIssue[] = []
  if (!input.name?.trim()) {
    issues.push({ field: "name", message: "Profielnaam is verplicht." })
  }
  const rates = input.country_rates || {}
  const activeCountries = Object.entries(rates).filter(
    ([, cfg]) => cfg?.active !== false
  )
  if (!activeCountries.length) {
    issues.push({
      field: "country_rates",
      message: "Selecteer minimaal één bestemmingsland.",
    })
  }
  for (const [code, cfg] of activeCountries) {
    if (cfg.free_shipping) continue
    if (!Number.isFinite(cfg.shipping_cost) || cfg.shipping_cost < 0) {
      issues.push({
        field: `country_rates.${code}.shipping_cost`,
        message: `Verzendkosten voor ${code} zijn ongeldig.`,
      })
    }
  }
  const processing = input.processing_settings
  if (processing) {
    const days = processing.same_for_all_weekdays
      ? [processing.default_handover]
      : WEEKDAY_KEYS.map((k) => processing.weekdays[k]).filter(Boolean)
    const enabled = days.filter((d) => d?.enabled)
    if (!enabled.length) {
      issues.push({
        field: "processing_settings",
        message: "Stel minimaal één overdrachtsdag in.",
      })
    }
    for (const day of enabled) {
      if (!/^\d{2}:\d{2}$/.test(day!.cutoff_time || "")) {
        issues.push({
          field: "processing_settings.cutoff_time",
          message: "Uiterste besteltijd moet een geldige tijd zijn (bijv. 15:00).",
        })
        break
      }
    }
  }
  return issues
}

export function resolveEffectiveShippingCost(
  cfg: ShippingCountryConfig,
  orderSubtotal?: number | null
): number {
  if (cfg.free_shipping) return 0
  if (
    cfg.free_shipping_threshold != null &&
    orderSubtotal != null &&
    orderSubtotal >= cfg.free_shipping_threshold
  ) {
    return 0
  }
  return cfg.shipping_cost
}
