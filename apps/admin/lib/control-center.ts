/**
 * P2.21 Control Center — KPI → source mapping + period-aware platform metrics.
 * Geen business logic; alleen weergave-aggregatie van bestaande admin-bronnen.
 */

import type { DashboardMetric, MetricSource } from "./dashboard-api"
import { emptyPeriodComparison } from "./dashboard-kpi"
import {
  isInPeriod,
  resolvePeriodRange,
  type PeriodKey,
  type PeriodOption,
} from "./period"

/** Periode-opties voor Control Center (spec P2.21). */
export const CONTROL_CENTER_PERIOD_OPTIONS: PeriodOption[] = [
  { key: "today", label: "Vandaag" },
  { key: "yesterday", label: "Gisteren" },
  { key: "this_week", label: "Deze week" },
  { key: "this_month", label: "Deze maand" },
  { key: "previous_month", label: "Vorige maand" },
]

/**
 * Interne bronmapping (niet zichtbaar in UI tenzij KPI unavailable).
 * KPI → endpoint → veld → scope
 */
export const CONTROL_CENTER_KPI_SOURCES = {
  totalSellers: {
    endpoint: "GET /admin/partner-onboarding?tab=all",
    field: "count",
    scope: "lifetime" as const,
  },
  activeSellers: {
    endpoint: "GET /admin/partner-onboarding?tab=active",
    field: "count",
    scope: "lifetime" as const,
  },
  pendingSellerApprovals: {
    endpoint: "GET /admin/partner-onboarding?tab=queue",
    field: "count",
    scope: "lifetime" as const,
  },
  totalProducts: {
    endpoint: "GET /admin/product-cloud/products",
    field: "count",
    scope: "lifetime" as const,
  },
  pendingProductApprovals: {
    endpoint: "GET /admin/product-cloud/approvals",
    field: "count",
    scope: "lifetime" as const,
  },
  orders: {
    endpoint: "GET /admin/order-service/orders",
    field: "orders[].order.created_at (count in period)",
    scope: "period" as const,
  },
  revenue: {
    endpoint: "GET /admin/order-service/orders",
    field: "orders[].order_total (sum in period)",
    scope: "period" as const,
  },
  openPayouts: {
    endpoint: "GET /admin/finance/payouts",
    field: "payouts where status ∈ Gepland|In behandeling",
    scope: "lifetime" as const,
  },
} as const

function formatNlNumber(n: number): string {
  return new Intl.NumberFormat("nl-NL").format(n)
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function metric(
  numeric: number | null,
  source: MetricSource,
  opts?: { href?: string; note?: string; format?: "number" | "euro" }
): DashboardMetric {
  if (numeric == null || source === "unavailable") {
    return {
      value: "—",
      numeric: null,
      source: "unavailable",
      href: opts?.href,
      note: opts?.note ?? "Geen betrouwbare backend-bron",
      ...emptyPeriodComparison(null),
    }
  }
  return {
    value:
      opts?.format === "euro" ? formatEuro(numeric) : formatNlNumber(numeric),
    numeric,
    source,
    href: opts?.href,
    note: opts?.note,
    ...emptyPeriodComparison(numeric),
  }
}

export type ControlCenterPlatformKpis = {
  totalSellers: DashboardMetric
  activeSellers: DashboardMetric
  pendingSellerApprovals: DashboardMetric
  totalProducts: DashboardMetric
  pendingProductApprovals: DashboardMetric
  orders: DashboardMetric
  revenue: DashboardMetric
  openPayouts: DashboardMetric
}

export type ControlCenterPlatformSource = {
  sellersOk: boolean
  activeSellersOk: boolean
  sellerQueueOk: boolean
  productsOk: boolean
  productApprovalsOk: boolean
  ordersOk: boolean
  payoutsOk: boolean
  totalSellers: number | null
  activeSellers: number | null
  pendingSellerApprovals: number | null
  totalProducts: number | null
  pendingProductApprovals: number | null
  openPayouts: number | null
  orders: Array<{ created_at: string; order_total: number }>
}

/** Bouwt de 8 platform-KPI's; periode geldt alleen voor Orders en Omzet. */
export function buildControlCenterPlatformKpis(
  source: ControlCenterPlatformSource,
  period: PeriodKey
): ControlCenterPlatformKpis {
  const range = resolvePeriodRange(period)

  const ordersInPeriod = source.ordersOk
    ? source.orders.filter((o) => isInPeriod(o.created_at, range))
    : null
  const orderCount =
    ordersInPeriod != null ? ordersInPeriod.length : null
  const revenue =
    ordersInPeriod != null
      ? ordersInPeriod.reduce((s, o) => s + (Number(o.order_total) || 0), 0)
      : null

  return {
    totalSellers: metric(
      source.totalSellers,
      source.sellersOk ? "api" : "unavailable",
      {
        href: "/partners",
        note: source.sellersOk
          ? "Lifetime · alle sellers"
          : CONTROL_CENTER_KPI_SOURCES.totalSellers.endpoint,
      }
    ),
    activeSellers: metric(
      source.activeSellers,
      source.activeSellersOk ? "api" : "unavailable",
      {
        href: "/partners",
        note: source.activeSellersOk
          ? "Lifetime · status Goedgekeurd"
          : CONTROL_CENTER_KPI_SOURCES.activeSellers.endpoint,
      }
    ),
    pendingSellerApprovals: metric(
      source.pendingSellerApprovals,
      source.sellerQueueOk ? "api" : "unavailable",
      {
        href: "/partners",
        note: source.sellerQueueOk
          ? "Open wachtrij"
          : CONTROL_CENTER_KPI_SOURCES.pendingSellerApprovals.endpoint,
      }
    ),
    totalProducts: metric(
      source.totalProducts,
      source.productsOk ? "api" : "unavailable",
      {
        href: "/product-cloud/products",
        note: source.productsOk
          ? "Lifetime"
          : CONTROL_CENTER_KPI_SOURCES.totalProducts.endpoint,
      }
    ),
    pendingProductApprovals: metric(
      source.pendingProductApprovals,
      source.productApprovalsOk ? "api" : "unavailable",
      {
        href: "/product-cloud/products/approvals",
        note: source.productApprovalsOk
          ? "Open goedkeuringswachtrij"
          : CONTROL_CENTER_KPI_SOURCES.pendingProductApprovals.endpoint,
      }
    ),
    orders: metric(orderCount, source.ordersOk ? "api" : "unavailable", {
      href: "/orders",
      note: source.ordersOk
        ? "In geselecteerde periode"
        : CONTROL_CENTER_KPI_SOURCES.orders.endpoint,
    }),
    revenue: metric(revenue, source.ordersOk ? "api" : "unavailable", {
      href: "/finance",
      format: "euro",
      note: source.ordersOk
        ? "Som order_total in periode"
        : CONTROL_CENTER_KPI_SOURCES.revenue.endpoint,
    }),
    openPayouts: metric(
      source.openPayouts,
      source.payoutsOk ? "api" : "unavailable",
      {
        href: "/finance",
        note: source.payoutsOk
          ? "Open (Gepland / In behandeling)"
          : CONTROL_CENTER_KPI_SOURCES.openPayouts.endpoint,
      }
    ),
  }
}

export const PLATFORM_KPI_DISPLAY: Array<{
  id: keyof ControlCenterPlatformKpis
  label: string
  format?: "euro" | "number"
  lifetime?: boolean
}> = [
  { id: "totalSellers", label: "Totaal sellers", lifetime: true },
  { id: "activeSellers", label: "Actieve sellers", lifetime: true },
  { id: "pendingSellerApprovals", label: "Seller-aanvragen", lifetime: true },
  { id: "totalProducts", label: "Totaal producten", lifetime: true },
  {
    id: "pendingProductApprovals",
    label: "Producten ter goedkeuring",
    lifetime: true,
  },
  { id: "orders", label: "Orders" },
  { id: "revenue", label: "Omzet", format: "euro" },
  { id: "openPayouts", label: "Open payouts", lifetime: true },
]
