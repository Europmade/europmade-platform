"use client"

import Link from "next/link"
import type { KpiTrendDirection } from "../lib/dashboard-kpi"

export type KpiCardProps = {
  value: string
  label: string
  href?: string
  linkLabel?: string
  source?: "api" | "unavailable" | "demo"
  note?: string
  periodKey?: string
  className?: string
  currentValue?: number | null
  previousValue?: number | null
  difference?: number | null
  percentageDifference?: number | null
  trend?: KpiTrendDirection | null
  comparisonLabel?: string | null
  /** Opmaak voor vergelijkingsregels (vorige/verschil). */
  valueFormat?: "number" | "euro"
  /** Visuele hiërarchie — alleen typografie, geen kleuren. */
  emphasis?: "primary" | "default"
  /** Toekomstige management-KPI's — alleen data-attrs, niet gerenderd. */
  averageOrderValue?: number | null
  conversionRate?: number | null
  returnRate?: number | null
  growthRate?: number | null
  netCommission?: number | null
  revenueGrowth?: number | null
}

function formatSecondary(
  n: number,
  format: "number" | "euro"
): string {
  if (format === "euro") {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(n)
  }
  return new Intl.NumberFormat("nl-NL").format(n)
}

/** Generiek KPI-vak — toont vergelijking alleen bij echte waarden. */
export function KpiCard({
  value,
  label,
  href,
  linkLabel,
  source,
  note,
  periodKey,
  className = "",
  currentValue,
  previousValue,
  difference,
  percentageDifference,
  trend,
  comparisonLabel,
  valueFormat = "number",
  emphasis = "default",
  averageOrderValue,
  conversionRate,
  returnRate,
  growthRate,
  netCommission,
  revenueGrowth,
}: KpiCardProps) {
  const showComparison =
    previousValue != null &&
    Number.isFinite(previousValue) &&
    difference != null &&
    Number.isFinite(difference)

  const trendArrow =
    trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "→" : null

  const valueClass =
    emphasis === "primary"
      ? "text-[32px] font-bold leading-none text-wf-900"
      : "text-[26px] font-bold leading-none text-wf-900"

  return (
    <div
      className={`rounded-lg border border-wf-300 bg-white px-5 py-[18px] ${className}`}
      data-period={periodKey}
      data-kpi-emphasis={emphasis}
      data-kpi-current={
        currentValue == null ? undefined : String(currentValue)
      }
      data-kpi-previous={
        previousValue == null ? undefined : String(previousValue)
      }
      data-kpi-difference={
        difference == null ? undefined : String(difference)
      }
      data-kpi-pct={
        percentageDifference == null
          ? undefined
          : String(percentageDifference)
      }
      data-kpi-trend={trend ?? undefined}
      data-kpi-aov={
        averageOrderValue == null ? undefined : String(averageOrderValue)
      }
      data-kpi-conversion={
        conversionRate == null ? undefined : String(conversionRate)
      }
      data-kpi-return-rate={
        returnRate == null ? undefined : String(returnRate)
      }
      data-kpi-growth={growthRate == null ? undefined : String(growthRate)}
      data-kpi-net-commission={
        netCommission == null ? undefined : String(netCommission)
      }
      data-kpi-revenue-growth={
        revenueGrowth == null ? undefined : String(revenueGrowth)
      }
    >
      <div className={valueClass}>{value}</div>
      <div className="mt-1.5 text-[11.5px] text-wf-600">{label}</div>

      {showComparison ? (
        <div className="mt-2 space-y-0.5 text-[10.5px] text-wf-600">
          <div>
            Vorige periode: {formatSecondary(previousValue, valueFormat)}
          </div>
          <div>
            Verschil: {formatSecondary(difference, valueFormat)}
            {percentageDifference != null && Number.isFinite(percentageDifference)
              ? ` (${trendArrow ? `${trendArrow} ` : ""}${new Intl.NumberFormat(
                  "nl-NL",
                  { maximumFractionDigits: 1 }
                ).format(percentageDifference)}%)`
              : null}
          </div>
          {comparisonLabel ? (
            <div className="text-wf-500">{comparisonLabel}</div>
          ) : null}
        </div>
      ) : null}

      {source === "unavailable" ? (
        <div className="mt-1 text-[10.5px] text-wf-500">
          {note ?? "Geen gegevens beschikbaar"}
        </div>
      ) : null}
      {source === "demo" ? (
        <div className="mt-1 text-[10.5px] text-wf-500">Demo-data</div>
      ) : null}
      {linkLabel && href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-[11px] text-wf-700 underline"
        >
          ↳ {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}
