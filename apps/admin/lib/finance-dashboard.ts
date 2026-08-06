/**
 * Finance management-KPI's uit bestaande admin-bronnen
 * (order-service orders + /admin/finance/payouts).
 * Geen demo-data; ontbrekende bronnen → unavailable.
 */

import type { DashboardMetric, MetricSource } from "./dashboard-api"
import {
  computePeriodComparison,
  emptyPeriodComparison,
} from "./dashboard-kpi"
import {
  isInPeriod,
  resolvePeriodRange,
  resolvePreviousPeriodRange,
  type PeriodKey,
  type PeriodRange,
} from "./period"
import { FINANCE_BI_EXTENSION_POINTS } from "./finance-bi"

export type FinanceOrderRow = {
  created_at: string
  order_total: number
}

export type FinancePayoutRow = {
  amount: number
  status: string
  created_at: string
  processed_at?: string | null
  recipient_type: string
}

export type FinanceDashboardSource = {
  ordersOk: boolean
  payoutsOk: boolean
  orders: FinanceOrderRow[]
  payouts: FinancePayoutRow[]
}

export type FinanceManagementKpis = {
  revenue: DashboardMetric
  commissions: DashboardMetric
  openPayouts: DashboardMetric
  paidOutPeriod: DashboardMetric
  amountPayable: DashboardMetric
  producerEarnings: DashboardMetric
  retailerEarnings: DashboardMetric
  affiliateCommissions: DashboardMetric
  /** BI-uitbreidpunten (nog zonder UI). */
  biExtensionPoints: typeof FINANCE_BI_EXTENSION_POINTS
}

function formatNlNumber(n: number): string {
  return new Intl.NumberFormat("nl-NL").format(n)
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function metricBase(
  numeric: number | null,
  source: MetricSource,
  opts?: {
    href?: string
    note?: string
    format?: "number" | "euro"
    comparisonLabel?: string
    previous?: number | null
    periodKey?: PeriodKey
  }
): DashboardMetric {
  const format = opts?.format ?? "number"
  if (numeric == null || source === "unavailable") {
    return {
      value: "—",
      numeric: null,
      source: source === "demo" ? "demo" : "unavailable",
      href: opts?.href,
      note: opts?.note ?? "Geen gegevens beschikbaar",
      comparisonLabel: opts?.comparisonLabel,
      ...emptyPeriodComparison(null),
      periodKey: opts?.periodKey,
    }
  }

  const comparison = computePeriodComparison(
    numeric,
    opts?.previous ?? null,
    opts?.periodKey
  )

  const value =
    format === "euro" ? formatEuro(numeric) : formatNlNumber(numeric)

  return {
    value,
    numeric,
    source,
    href: opts?.href,
    note: opts?.note,
    comparisonLabel: opts?.comparisonLabel,
    ...comparison,
  }
}

function sumOrdersInRange(
  orders: FinanceOrderRow[],
  range: PeriodRange | null
): number | null {
  if (!range) return null
  return orders
    .filter((o) => isInPeriod(o.created_at, range))
    .reduce((s, o) => s + (Number(o.order_total) || 0), 0)
}

function sumPayouts(
  payouts: FinancePayoutRow[],
  predicate: (p: FinancePayoutRow) => boolean
): number {
  return payouts
    .filter(predicate)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
}

const OPEN_STATUSES = new Set(["Gepland", "In behandeling"])

/**
 * Bouwt finance management-KPI's voor de gekozen periode.
 */
export function buildFinanceManagementKpis(
  source: FinanceDashboardSource,
  periodKey: PeriodKey
): FinanceManagementKpis {
  const current = resolvePeriodRange(periodKey)
  const previous = resolvePreviousPeriodRange(periodKey)

  const revenueCurrent = source.ordersOk
    ? sumOrdersInRange(source.orders, current)
    : null
  const revenuePrevious = source.ordersOk
    ? sumOrdersInRange(source.orders, previous)
    : null

  const openAmount = source.payoutsOk
    ? sumPayouts(source.payouts, (p) => OPEN_STATUSES.has(p.status))
    : null
  const openCount = source.payoutsOk
    ? source.payouts.filter((p) => OPEN_STATUSES.has(p.status)).length
    : null

  const paidOutCurrent = source.payoutsOk
    ? sumPayouts(source.payouts, (p) => {
        if (p.status !== "Voltooid") return false
        const when = p.processed_at ?? p.created_at
        return isInPeriod(when, current)
      })
    : null
  const paidOutPrevious = source.payoutsOk
    ? sumPayouts(source.payouts, (p) => {
        if (p.status !== "Voltooid") return false
        if (!previous) return false
        const when = p.processed_at ?? p.created_at
        return isInPeriod(when, previous)
      })
    : null

  const sellerEarnings = source.payoutsOk
    ? sumPayouts(
        source.payouts,
        (p) =>
          p.recipient_type === "Seller" &&
          p.status !== "Geannuleerd" &&
          isInPeriod(p.created_at, current)
      )
    : null

  const affiliateEarnings = source.payoutsOk
    ? sumPayouts(
        source.payouts,
        (p) =>
          p.recipient_type === "Affiliate" &&
          p.status !== "Geannuleerd" &&
          isInPeriod(p.created_at, current)
      )
    : null

  return {
    revenue: metricBase(revenueCurrent, revenueCurrent != null ? "api" : "unavailable", {
      format: "euro",
      previous: revenuePrevious,
      periodKey,
      comparisonLabel: "t.o.v. vorige periode",
      note:
        revenueCurrent != null
          ? "Som order_total in gekozen periode"
          : "Orders-API niet beschikbaar",
    }),
    commissions: metricBase(null, "unavailable", {
      format: "euro",
      periodKey,
      note: "Geen admin commissie-list-API (alleen payouts)",
    }),
    openPayouts: metricBase(openCount, openCount != null ? "api" : "unavailable", {
      format: "number",
      periodKey,
      note:
        openCount != null
          ? "Aantal payouts Gepland / In behandeling"
          : "Finance payouts-API niet beschikbaar",
    }),
    paidOutPeriod: metricBase(
      paidOutCurrent,
      paidOutCurrent != null ? "api" : "unavailable",
      {
        format: "euro",
        previous: paidOutPrevious,
        periodKey,
        comparisonLabel: "t.o.v. vorige periode",
        note:
          paidOutCurrent != null
            ? "Som Voltooid in periode (processed_at of created_at)"
            : "Finance payouts-API niet beschikbaar",
      }
    ),
    amountPayable: metricBase(
      openAmount,
      openAmount != null ? "api" : "unavailable",
      {
        format: "euro",
        periodKey,
        note:
          openAmount != null
            ? "Som bedragen Gepland / In behandeling"
            : "Finance payouts-API niet beschikbaar",
      }
    ),
    producerEarnings: metricBase(null, "unavailable", {
      format: "euro",
      periodKey,
      note: "Geen producer-split in payout recipient_type (alleen Seller/Affiliate)",
    }),
    retailerEarnings: metricBase(
      sellerEarnings,
      sellerEarnings != null ? "api" : "unavailable",
      {
        format: "euro",
        periodKey,
        note:
          sellerEarnings != null
            ? "Som Seller-payouts in periode (niet geannuleerd)"
            : "Finance payouts-API niet beschikbaar",
      }
    ),
    affiliateCommissions: metricBase(
      affiliateEarnings,
      affiliateEarnings != null ? "api" : "unavailable",
      {
        format: "euro",
        periodKey,
        note:
          affiliateEarnings != null
            ? "Som Affiliate-payouts in periode (niet geannuleerd)"
            : "Finance payouts-API niet beschikbaar",
      }
    ),
    biExtensionPoints: FINANCE_BI_EXTENSION_POINTS,
  }
}

export const FINANCE_MANAGEMENT_KPI_DEFS: Array<{
  id: string
  label: string
  group: "omzet" | "commissies" | "uitbetalingen" | "partners"
  select: (k: FinanceManagementKpis) => DashboardMetric
}> = [
  {
    id: "revenue",
    label: "Omzet gekozen periode",
    group: "omzet",
    select: (k) => k.revenue,
  },
  {
    id: "commissions",
    label: "Commissie gekozen periode",
    group: "commissies",
    select: (k) => k.commissions,
  },
  {
    id: "open_payouts",
    label: "Open uitbetalingen",
    group: "uitbetalingen",
    select: (k) => k.openPayouts,
  },
  {
    id: "paid_out_period",
    label: "Uitbetaald deze periode",
    group: "uitbetalingen",
    select: (k) => k.paidOutPeriod,
  },
  {
    id: "amount_payable",
    label: "Nog te betalen",
    group: "uitbetalingen",
    select: (k) => k.amountPayable,
  },
  {
    id: "producer_earnings",
    label: "Actieve verdiensten producenten",
    group: "partners",
    select: (k) => k.producerEarnings,
  },
  {
    id: "retailer_earnings",
    label: "Actieve verdiensten retailers",
    group: "partners",
    select: (k) => k.retailerEarnings,
  },
  {
    id: "affiliate_commissions",
    label: "Affiliate commissies",
    group: "partners",
    select: (k) => k.affiliateCommissions,
  },
]
