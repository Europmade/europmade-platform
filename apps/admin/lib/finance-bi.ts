/**
 * Business Intelligence-uitbreidpunten voor Finance (Sprint 4+).
 * Geen UI — alleen types/services-contracten voor latere grafieken/analyses.
 */

export type FinanceBiDimension =
  | "category"
  | "country"
  | "partner"
  | "day"

export type FinanceBiMetricKind =
  | "revenue"
  | "commission"
  | "average_order_value"
  | "orders_count"

/** Toekomstige serie (nog geen data-binding). */
export type FinanceBiSeriesPoint = {
  key: string
  label: string
  value: number | null
  periodStart?: string
  periodEnd?: string
}

export type FinanceBiBreakdownRequest = {
  metric: FinanceBiMetricKind
  dimension: FinanceBiDimension
  periodKey: string
}

export type FinanceBiBreakdownResult = {
  metric: FinanceBiMetricKind
  dimension: FinanceBiDimension
  points: FinanceBiSeriesPoint[]
  available: boolean
  unavailableReason?: string
}

/**
 * Geplande BI-queries — nog niet geïmplementeerd (geen admin-aggregatie-API).
 * Latere Sprint kan deze stubs vervangen door echte service-calls.
 */
export const FINANCE_BI_EXTENSION_POINTS = [
  "revenue_by_category",
  "revenue_by_country",
  "revenue_by_partner",
  "commission_by_category",
  "commission_by_partner",
  "average_order_value",
  "orders_per_day",
  "revenue_per_day",
] as const

export type FinanceBiExtensionPoint =
  (typeof FINANCE_BI_EXTENSION_POINTS)[number]

export function financeBiUnavailable(
  metric: FinanceBiMetricKind,
  dimension: FinanceBiDimension,
  reason: string
): FinanceBiBreakdownResult {
  return {
    metric,
    dimension,
    points: [],
    available: false,
    unavailableReason: reason,
  }
}
