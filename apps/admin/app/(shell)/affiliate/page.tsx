"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { AffiliatePeriodFilter } from "../../../components/affiliate-period-filter"
import { KpiCard } from "../../../components/kpi-card"
import {
  affiliateNeedsReview,
  displayAffiliateStatus,
  getAffiliatePerformance,
  type AffiliatePerformancePeriodDays,
  type AffiliatePerformanceRow,
} from "../../../lib/affiliate-admin-api"

const STATUS_FILTERS = [
  { value: "", label: "Alle" },
  { value: "Ingediend", label: "Ingediend" },
  { value: "In beoordeling", label: "In beoordeling" },
  { value: "Goedgekeurd", label: "Goedgekeurd" },
  { value: "Afgekeurd", label: "Afgewezen" },
] as const

type SortKey =
  | "legal_name"
  | "status"
  | "orders"
  | "revenue"
  | "commission_awarded"
  | "clicks"
  | "conversion_rate"

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function formatPct(n: number) {
  return `${new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 1,
  }).format(n)}%`
}

function formatInt(n: number) {
  return new Intl.NumberFormat("nl-NL").format(n)
}

export default function AdminAffiliatePage() {
  const [periodDays, setPeriodDays] =
    useState<AffiliatePerformancePeriodDays>(30)
  const [statusFilter, setStatusFilter] = useState("")
  const [rows, setRows] = useState<AffiliatePerformanceRow[]>([])
  const [totals, setTotals] = useState<
    Awaited<ReturnType<typeof getAffiliatePerformance>>["totals"] | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAffiliatePerformance(periodDays)
      .then((d) => {
        if (cancelled) return
        setRows(d.affiliates ?? [])
        setTotals(d.totals)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : "Affiliate-performance laden mislukt."
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [periodDays])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
      return
    }
    setSortKey(key)
    setSortDir(key === "legal_name" || key === "status" ? "asc" : "desc")
  }

  const visible = useMemo(() => {
    const filtered = statusFilter
      ? rows.filter((r) => r.onboarding_status === statusFilter)
      : rows
    const copy = [...filtered]
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      if (sortKey === "legal_name" || sortKey === "status") {
        const av =
          sortKey === "legal_name"
            ? (a.legal_name || "").toLowerCase()
            : a.onboarding_status
        const bv =
          sortKey === "legal_name"
            ? (b.legal_name || "").toLowerCase()
            : b.onboarding_status
        return av.localeCompare(bv, "nl") * dir
      }
      return (a[sortKey] - b[sortKey]) * dir
    })
    return copy
  }, [rows, statusFilter, sortKey, sortDir])

  if (error) return <Notice variant="warning">{error}</Notice>

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Affiliate &gt;{" "}
        <b className="font-semibold text-wf-800">Performance Center</b>
      </p>
      <h1 className="text-[19px] font-bold text-wf-900">Affiliate</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Overzicht van affiliate-omzet en -orders. Beoordeel aanvragen in dezelfde
        lijst. Geen demo-data.
      </p>

      <section className="mt-6">
        <div className="mb-3 flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
          <h2 className="text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Affiliate Performance
          </h2>
          <AffiliatePeriodFilter
            value={periodDays}
            onChange={setPeriodDays}
            id="affiliate-list-period"
          />
        </div>

        {loading || !totals ? (
          <p className="text-xs text-wf-600">Laden…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
            <KpiCard
              value={formatInt(totals.active_affiliates)}
              label="Actieve affiliates"
              periodKey={String(periodDays)}
            />
            <KpiCard
              value={formatInt(totals.pending_affiliates)}
              label="Nieuwe aanvragen"
              periodKey={String(periodDays)}
            />
            <KpiCard
              value={formatInt(totals.orders)}
              label="Orders via affiliates"
              periodKey={String(periodDays)}
            />
            <KpiCard
              value={formatEuro(totals.revenue)}
              label="Affiliate omzet"
              valueFormat="euro"
              periodKey={String(periodDays)}
            />
            <KpiCard
              value={formatEuro(totals.commission_awarded)}
              label="Affiliate commissie"
              valueFormat="euro"
              periodKey={String(periodDays)}
            />
            <KpiCard
              value={formatInt(totals.clicks)}
              label="Clicks"
              periodKey={String(periodDays)}
            />
            <KpiCard
              value={formatPct(totals.conversion_rate)}
              label="Conversieratio"
              periodKey={String(periodDays)}
            />
            <KpiCard
              value={formatEuro(totals.payout_open)}
              label="Openstaande payouts"
              valueFormat="euro"
              periodKey={String(periodDays)}
            />
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Affiliates
          </h2>
          <label className="flex items-center gap-2 text-[11px] text-wf-600">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 min-w-[140px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
            >
              {STATUS_FILTERS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p className="text-xs text-wf-600">Laden…</p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-wf-600">Geen affiliates geregistreerd.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <SortTh
                    label="Bedrijf"
                    active={sortKey === "legal_name"}
                    dir={sortDir}
                    onClick={() => toggleSort("legal_name")}
                  />
                  <SortTh
                    label="Status"
                    active={sortKey === "status"}
                    dir={sortDir}
                    onClick={() => toggleSort("status")}
                  />
                  <SortTh
                    label="Orders"
                    active={sortKey === "orders"}
                    dir={sortDir}
                    onClick={() => toggleSort("orders")}
                  />
                  <SortTh
                    label="Omzet"
                    active={sortKey === "revenue"}
                    dir={sortDir}
                    onClick={() => toggleSort("revenue")}
                  />
                  <SortTh
                    label="Commissie"
                    active={sortKey === "commission_awarded"}
                    dir={sortDir}
                    onClick={() => toggleSort("commission_awarded")}
                  />
                  <SortTh
                    label="Clicks"
                    active={sortKey === "clicks"}
                    dir={sortDir}
                    onClick={() => toggleSort("clicks")}
                  />
                  <SortTh
                    label="Conversie"
                    active={sortKey === "conversion_rate"}
                    dir={sortDir}
                    onClick={() => toggleSort("conversion_rate")}
                  />
                  <th className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                    {" "}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const review = affiliateNeedsReview(row.onboarding_status)
                  return (
                    <tr
                      key={row.affiliate_id}
                      className="border-b border-wf-200 last:border-b-0"
                    >
                      <td className="px-4 py-2.5 text-wf-800">
                        {row.legal_name || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline">
                          {displayAffiliateStatus(row.onboarding_status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-wf-700">
                        {formatInt(row.orders)}
                      </td>
                      <td className="px-4 py-2.5 text-wf-700">
                        {formatEuro(row.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-wf-700">
                        {formatEuro(row.commission_awarded)}
                      </td>
                      <td className="px-4 py-2.5 text-wf-700">
                        {formatInt(row.clicks)}
                      </td>
                      <td className="px-4 py-2.5 text-wf-700">
                        {formatPct(row.conversion_rate)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/affiliate/${row.affiliate_id}`}
                          className="text-[11px] text-wf-800 underline"
                        >
                          {review ? "Beoordelen" : "Bekijken"}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function SortTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
}) {
  return (
    <th className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 text-left uppercase tracking-[0.04em]"
      >
        {label}
        {active ? <span aria-hidden>{dir === "desc" ? "↓" : "↑"}</span> : null}
      </button>
    </th>
  )
}
