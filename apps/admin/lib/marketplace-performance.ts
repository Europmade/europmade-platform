/**
 * Marketplace Performance — management-KPI's bovenop bestaande admin-bronnen.
 * Geen schattingen; ontbrekend → "Nog niet beschikbaar".
 */

import type { DashboardMetric, MetricSource } from "./dashboard-api"
import { emptyPeriodComparison, type KpiPeriodComparison } from "./dashboard-kpi"
import type { FinanceManagementKpis } from "./finance-dashboard"
import { isInPeriod, resolvePeriodRange, type PeriodKey } from "./period"

export const MARKETPLACE_PERFORMANCE_EXTENSIONS = [
  "top_partners",
  "top_products",
  "top_categories",
  "top_risers",
  "top_fallers",
] as const

export type MarketplacePerformanceExtension =
  (typeof MARKETPLACE_PERFORMANCE_EXTENSIONS)[number]

/** Toekomstige management-KPI's — nog niet in UI. */
export type FutureManagementKpiFields = {
  averageOrderValue?: number | null
  conversionRate?: number | null
  returnRate?: number | null
  growthRate?: number | null
  netCommission?: number | null
  revenueGrowth?: number | null
}

export type PerformanceCatalogSource = {
  partnersOk: boolean
  productsOk: boolean
  partnersCreatedAt: string[]
  productsCreatedAt: string[]
}

export type PerformanceKpi = DashboardMetric &
  FutureManagementKpiFields & {
    emphasis: "primary" | "default"
    valueFormat: "number" | "euro"
  }

export type MarketplacePerformanceKpis = {
  revenue: PerformanceKpi
  commissions: PerformanceKpi
  orders: PerformanceKpi
  newPartners: PerformanceKpi
  newProducts: PerformanceKpi
  openPartnerRequests: PerformanceKpi
  openModeration: PerformanceKpi
  openPayouts: PerformanceKpi
  extensions: readonly MarketplacePerformanceExtension[]
}

export type MarketplacePerformanceInput = {
  financeSource: {
    ordersOk: boolean
    orders: Array<{ created_at: string }>
  }
  performanceSource: PerformanceCatalogSource
  marketplace: { pendingPartnerRequests: DashboardMetric }
  moderation: { openCases: DashboardMetric }
}

function formatNlNumber(n: number): string {
  return new Intl.NumberFormat("nl-NL").format(n)
}

function asPerformance(
  metric: DashboardMetric,
  opts: {
    emphasis: "primary" | "default"
    valueFormat: "number" | "euro"
  }
): PerformanceKpi {
  if (metric.source === "unavailable") {
    return {
      ...metric,
      value: "—",
      note: "Nog niet beschikbaar",
      emphasis: opts.emphasis,
      valueFormat: opts.valueFormat,
      averageOrderValue: null,
      conversionRate: null,
      returnRate: null,
      growthRate: null,
      netCommission: null,
      revenueGrowth: null,
    }
  }
  return {
    ...metric,
    emphasis: opts.emphasis,
    valueFormat: opts.valueFormat,
    averageOrderValue: null,
    conversionRate: null,
    returnRate: null,
    growthRate: null,
    netCommission: null,
    revenueGrowth: null,
  }
}

function countMetric(
  numeric: number | null,
  source: MetricSource,
  periodKey: PeriodKey,
  comparison?: KpiPeriodComparison
): DashboardMetric {
  if (numeric == null || source === "unavailable") {
    return {
      value: "—",
      numeric: null,
      source: "unavailable",
      note: "Nog niet beschikbaar",
      ...emptyPeriodComparison(null),
      periodKey,
    }
  }
  return {
    value: formatNlNumber(numeric),
    numeric,
    source,
    ...emptyPeriodComparison(numeric),
    ...comparison,
    periodKey,
  }
}

export const MARKETPLACE_PERFORMANCE_KPI_DEFS: Array<{
  id: keyof Omit<MarketplacePerformanceKpis, "extensions">
  label: string
}> = [
  { id: "revenue", label: "Omzet geselecteerde periode" },
  { id: "commissions", label: "Commissie geselecteerde periode" },
  { id: "orders", label: "Orders geselecteerde periode" },
  { id: "newPartners", label: "Nieuwe partners" },
  { id: "newProducts", label: "Nieuwe producten" },
  { id: "openPartnerRequests", label: "Open partneraanvragen" },
  { id: "openModeration", label: "Open moderatiezaken" },
  { id: "openPayouts", label: "Open uitbetalingen" },
]

/**
 * Bouwt Marketplace Performance-KPI's voor de gekozen periode.
 */
export function buildMarketplacePerformanceKpis(
  data: MarketplacePerformanceInput,
  finance: FinanceManagementKpis,
  periodKey: PeriodKey
): MarketplacePerformanceKpis {
  const range = resolvePeriodRange(periodKey)
  const catalog = data.performanceSource

  const ordersInPeriod = data.financeSource.ordersOk
    ? data.financeSource.orders.filter((o) =>
        isInPeriod(o.created_at, range)
      ).length
    : null

  const newPartners = catalog.partnersOk
    ? catalog.partnersCreatedAt.filter((iso) => isInPeriod(iso, range)).length
    : null

  const newProducts = catalog.productsOk
    ? catalog.productsCreatedAt.filter((iso) => isInPeriod(iso, range)).length
    : null

  return {
    revenue: asPerformance(finance.revenue, {
      emphasis: "primary",
      valueFormat: "euro",
    }),
    commissions: asPerformance(finance.commissions, {
      emphasis: "primary",
      valueFormat: "euro",
    }),
    orders: asPerformance(
      countMetric(
        ordersInPeriod,
        ordersInPeriod != null ? "api" : "unavailable",
        periodKey
      ),
      { emphasis: "primary", valueFormat: "number" }
    ),
    newPartners: asPerformance(
      countMetric(
        newPartners,
        newPartners != null ? "api" : "unavailable",
        periodKey
      ),
      { emphasis: "default", valueFormat: "number" }
    ),
    newProducts: asPerformance(
      countMetric(
        newProducts,
        newProducts != null ? "api" : "unavailable",
        periodKey
      ),
      { emphasis: "default", valueFormat: "number" }
    ),
    openPartnerRequests: asPerformance(data.marketplace.pendingPartnerRequests, {
      emphasis: "default",
      valueFormat: "number",
    }),
    openModeration: asPerformance(data.moderation.openCases, {
      emphasis: "default",
      valueFormat: "number",
    }),
    openPayouts: asPerformance(finance.openPayouts, {
      emphasis: "default",
      valueFormat: "number",
    }),
    extensions: MARKETPLACE_PERFORMANCE_EXTENSIONS,
  }
}
