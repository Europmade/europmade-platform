"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { DashboardSection } from "../../../components/dashboard-section"
import { KpiCard } from "../../../components/kpi-card"
import { PeriodFilter } from "../../../components/period-filter"
import {
  loadAdminDashboard,
  type AdminDashboardData,
  type DashboardMetric,
} from "../../../lib/dashboard-api"
import {
  DASHBOARD_DOMAIN_SECTIONS,
  type DashboardKpiDefinition,
} from "../../../lib/dashboard-sections"
import {
  buildFinanceManagementKpis,
  FINANCE_MANAGEMENT_KPI_DEFS,
} from "../../../lib/finance-dashboard"
import {
  buildMarketplacePerformanceKpis,
  MARKETPLACE_PERFORMANCE_KPI_DEFS,
  type PerformanceKpi,
} from "../../../lib/marketplace-performance"
import {
  PERIOD_OPTIONS,
  resolvePeriodRange,
  type PeriodKey,
} from "../../../lib/period"

/**
 * Centrale Admin-cockpit (scherm #54) — Marketplace Performance + operationele blokken.
 */
export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKey>("today")

  useEffect(() => {
    let cancelled = false
    loadAdminDashboard()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Dashboard laden mislukt."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const financeKpis = useMemo(() => {
    if (!data) return null
    return buildFinanceManagementKpis(data.financeSource, period)
  }, [data, period])

  const performanceKpis = useMemo(() => {
    if (!data || !financeKpis) return null
    return buildMarketplacePerformanceKpis(data, financeKpis, period)
  }, [data, financeKpis, period])

  if (error) {
    return <Notice variant="warning">{error}</Notice>
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-[19px] font-bold text-wf-900">Admin Dashboard</h1>
        <p className="mt-3 text-xs text-wf-600">Dashboard laden…</p>
      </div>
    )
  }

  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? period
  const range = resolvePeriodRange(period)

  const sectionsBeforeFinance = DASHBOARD_DOMAIN_SECTIONS.filter(
    (s) => s.id === "marketplace" || s.id === "orders"
  )
  const sectionsAfterFinance = DASHBOARD_DOMAIN_SECTIONS.filter(
    (s) => s.id === "moderation"
  )

  const primaryDefs = MARKETPLACE_PERFORMANCE_KPI_DEFS.filter((d) =>
    ["revenue", "commissions", "orders"].includes(d.id)
  )
  const secondaryDefs = MARKETPLACE_PERFORMANCE_KPI_DEFS.filter(
    (d) => !["revenue", "commissions", "orders"].includes(d.id)
  )

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Dashboard &gt;{" "}
        <b className="font-semibold text-wf-800">Admin Dashboard</b>
      </p>

      <div className="mb-5 flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">Admin Dashboard</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Platform-KPI&apos;s en snelle toegang tot beheermodules.
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <p className="mb-5 text-[10.5px] text-wf-500">
        Periode: {periodLabel}
        {range.from
          ? ` · vanaf ${range.from.toLocaleDateString("nl-NL")}`
          : " · gehele historie"}
      </p>

      {!data.backendReachable ? (
        <Notice variant="warning" className="mb-5">
          Backend niet bereikbaar. KPI&apos;s tonen beschikbare waarden of —.
        </Notice>
      ) : null}

      <DashboardSection
        title="Marketplace Performance"
        extensions={[
          "top_partners",
          "top_products",
          "top_categories",
          "top_risers",
          "top_fallers",
        ]}
        wrapChildren={false}
      >
        {performanceKpis ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 tablet:grid-cols-3">
              {primaryDefs.map((def) => (
                <PerformanceKpiCard
                  key={def.id}
                  label={def.label}
                  metric={performanceKpis[def.id]}
                  periodKey={period}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
              {secondaryDefs.map((def) => (
                <PerformanceKpiCard
                  key={def.id}
                  label={def.label}
                  metric={performanceKpis[def.id]}
                  periodKey={period}
                />
              ))}
            </div>
          </>
        ) : null}
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Aandacht vereist
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          {data.attention.length === 0 ? (
            <p className="px-[18px] py-4 text-xs text-wf-600">
              Geen openstaande acties.
            </p>
          ) : (
            data.attention.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 border-b border-wf-200 px-[18px] py-3 text-xs text-wf-700 last:border-b-0"
              >
                <span>
                  {item.severity === "warning" ? (
                    <span className="mr-2 inline-block rounded-full border border-wf-700 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      Actie
                    </span>
                  ) : null}
                  {item.label}
                </span>
                <Link
                  href={item.href}
                  className="shrink-0 text-[11px] text-wf-800 underline"
                >
                  Openen
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {sectionsBeforeFinance.map((section) => (
        <DashboardSection
          key={section.id}
          title={section.title}
          extensions={section.extensions}
        >
          {section.kpis.map((def) => (
            <MetricKpi
              key={def.id}
              def={def}
              data={data}
              periodKey={period}
            />
          ))}
        </DashboardSection>
      ))}

      <DashboardSection title="Finance" extensions={["revenue_trend", "growth"]}>
        {financeKpis
          ? FINANCE_MANAGEMENT_KPI_DEFS.map((def) => {
              const metric = def.select(financeKpis)
              return (
                <KpiCard
                  key={def.id}
                  value={metric.value}
                  label={def.label}
                  href={metric.href}
                  source={metric.source}
                  note={metric.note}
                  periodKey={period}
                  currentValue={metric.currentValue}
                  previousValue={metric.previousValue}
                  difference={metric.difference}
                  percentageDifference={metric.percentageDifference}
                  trend={metric.trend}
                  comparisonLabel={metric.comparisonLabel}
                  valueFormat={
                    def.id === "open_payouts" ? "number" : "euro"
                  }
                />
              )
            })
          : null}
      </DashboardSection>

      {sectionsAfterFinance.map((section) => (
        <DashboardSection
          key={section.id}
          title={section.title}
          extensions={section.extensions}
        >
          {section.kpis.map((def) => (
            <MetricKpi
              key={def.id}
              def={def}
              data={data}
              periodKey={period}
            />
          ))}
        </DashboardSection>
      ))}

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Systeemstatus
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border-b border-wf-400 px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  Component
                </th>
                <th className="border-b border-wf-400 px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  Status
                </th>
                <th className="border-b border-wf-400 px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {data.system.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-5 py-2.5 text-wf-800">{row.label}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`inline-block rounded-[10px] border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.03em] ${
                        row.ok
                          ? "border-wf-800 bg-wf-800 text-white"
                          : "border-wf-400 bg-wf-100 text-wf-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-wf-600">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function PerformanceKpiCard({
  label,
  metric,
  periodKey,
}: {
  label: string
  metric: PerformanceKpi
  periodKey: PeriodKey
}) {
  return (
    <KpiCard
      value={metric.value}
      label={label}
      href={metric.href}
      source={metric.source}
      note={metric.note}
      periodKey={periodKey}
      currentValue={metric.currentValue}
      previousValue={metric.previousValue}
      difference={metric.difference}
      percentageDifference={metric.percentageDifference}
      trend={metric.trend}
      comparisonLabel={metric.comparisonLabel}
      valueFormat={metric.valueFormat}
      emphasis={metric.emphasis}
      averageOrderValue={metric.averageOrderValue}
      conversionRate={metric.conversionRate}
      returnRate={metric.returnRate}
      growthRate={metric.growthRate}
      netCommission={metric.netCommission}
      revenueGrowth={metric.revenueGrowth}
    />
  )
}

function MetricKpi({
  def,
  data,
  periodKey,
}: {
  def: DashboardKpiDefinition
  data: AdminDashboardData
  periodKey: PeriodKey
}) {
  const metric: DashboardMetric = def.select(data)
  return (
    <KpiCard
      value={metric.value}
      label={def.label}
      href={metric.href}
      linkLabel={def.linkLabel}
      source={metric.source}
      note={metric.note}
      periodKey={periodKey}
      currentValue={metric.currentValue}
      previousValue={metric.previousValue}
      difference={metric.difference}
      percentageDifference={metric.percentageDifference}
      trend={metric.trend}
      comparisonLabel={metric.comparisonLabel}
    />
  )
}
