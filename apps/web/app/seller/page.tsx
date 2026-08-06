"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SellerGate } from "./_components/seller-gate"
import { KpiCard } from "./_components/kpi-card"
import { PeriodFilter } from "./_components/period-filter"
import { DashboardSection } from "./_components/dashboard-section"
import {
  PERIOD_OPTIONS,
  isInPeriod,
  resolvePeriodRange,
  type PeriodKey,
} from "./_lib/period"
import { formatEuro } from "../_components/storefront-shell"
import {
  DEMO_MARKETING_INVOICES,
  DEMO_ORDERS,
  DEMO_PRODUCTS,
  DEMO_REVIEWS,
} from "./_lib/demo-data"
import { DEMO_MESSAGE_THREADS, DEMO_RETURN_DETAILS } from "./_lib/demo-data-details"

/**
 * Seller Dashboard — periodefilter herberekent alle KPI's op demo-data.
 */
export default function SellerDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("this_month")
  const range = useMemo(() => resolvePeriodRange(period), [period])
  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? period

  const periodOrders = useMemo(
    () => DEMO_ORDERS.filter((o) => isInPeriod(o.created_at, range)),
    [range]
  )
  const periodRevenue = useMemo(
    () =>
      Math.round(
        periodOrders.reduce((sum, o) => sum + o.total, 0) * 100
      ) / 100,
    [periodOrders]
  )
  const periodReturns = useMemo(
    () => DEMO_RETURN_DETAILS.filter((r) => isInPeriod(r.created_at, range)),
    [range]
  )
  const periodMessages = useMemo(
    () => DEMO_MESSAGE_THREADS.filter((m) => isInPeriod(m.updated_at, range)),
    [range]
  )
  const unreadMessages = periodMessages.filter((m) => m.unread).length
  const openReturns = periodReturns.filter((r) =>
    ["Aangevraagd", "Bevestigd", "Ontvangen"].includes(r.status)
  ).length
  const openInvoices = DEMO_MARKETING_INVOICES.filter(
    (i) => i.status !== "Betaald"
  ).length
  const productsOnline = DEMO_PRODUCTS.filter((p) => p.listing === "live").length
  const productsConcept = DEMO_PRODUCTS.filter(
    (p) => p.listing === "concept"
  ).length
  const productsInReview = DEMO_PRODUCTS.filter(
    (p) => p.product_cloud_status === "In beoordeling"
  ).length
  const unansweredReviews = DEMO_REVIEWS.filter((r) => !r.answered).length

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of periodOrders) {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      map.set(key, Math.round(((map.get(key) ?? 0) + o.total) * 100) / 100)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [periodOrders])

  const actions = [
    {
      label: `${unreadMessages} nieuwe berichten`,
      href: "/seller/messages",
      show: unreadMessages > 0,
    },
    {
      label: `${productsInReview} producten wachten op goedkeuring`,
      href: "/seller/products",
      show: productsInReview > 0,
    },
    {
      label: `${openReturns} open retouren`,
      href: "/seller/returns",
      show: openReturns > 0,
    },
    {
      label: `${openInvoices} open facturen`,
      href: "/seller/marketing/billing",
      show: openInvoices > 0,
    },
  ].filter((a) => a.show)

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Dashboard" },
      ]}
    >
      <div className="mb-5 flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">Dashboard</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Overzicht van verkopen, producten en openstaande acties.
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <p className="mb-5 text-[10.5px] text-wf-500">
        Periode: {periodLabel}
        {range.from
          ? ` · vanaf ${range.from.toLocaleDateString("nl-NL")}`
          : null}{" "}
        · Noordzee Ambacht BV
      </p>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Actie vereist
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          {actions.length === 0 ? (
            <p className="px-[18px] py-4 text-xs text-wf-600">
              Geen openstaande acties in deze periode.
            </p>
          ) : (
            actions.map((item) => (
              <div
                key={item.href + item.label}
                className="flex items-center justify-between gap-3 border-b border-wf-200 px-[18px] py-3 text-xs text-wf-700 last:border-b-0"
              >
                <span>
                  <span className="mr-2 inline-block rounded-full border border-wf-700 px-2 py-0.5 text-[10px] font-semibold uppercase">
                    Actie
                  </span>
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

      <DashboardSection title="Prestaties gekozen periode" wrapChildren={false}>
        <div className="mb-4 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          <KpiCard
            emphasis="primary"
            periodKey={period}
            value={formatEuro(periodRevenue)}
            label="Omzet"
            source="api"
            href="/seller/finance"
            linkLabel="Financiën"
          />
          <KpiCard
            periodKey={period}
            value={String(periodOrders.length)}
            label="Orders"
            source="api"
            href="/seller/orders"
            linkLabel="Orders"
          />
          <KpiCard
            value={String(productsOnline)}
            label="Producten online"
            source="api"
            note={`${productsConcept} in concept`}
            href="/seller/products"
            linkLabel="Producten"
          />
          <KpiCard
            periodKey={period}
            value={String(periodReturns.length)}
            label="Retouren"
            source="api"
            href="/seller/returns"
            linkLabel="Retouren"
          />
          <KpiCard
            periodKey={period}
            value={String(periodMessages.length)}
            label="Berichten"
            source="api"
            note={`${unreadMessages} ongelezen`}
            href="/seller/messages"
            linkLabel="Berichten"
          />
          <KpiCard
            value={String(openInvoices)}
            label="Open facturen"
            source="api"
            href="/seller/marketing/billing"
            linkLabel="Facturen"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <KpiCard
            value={String(productsInReview)}
            label="Producten in beoordeling"
            source="api"
            href="/seller/products"
            linkLabel="Producten"
          />
          <KpiCard
            value={String(unansweredReviews)}
            label="Reviews wachten op reactie"
            source="api"
            href="/seller/reviews"
            linkLabel="Reviews"
          />
          <KpiCard
            value={String(openReturns)}
            label="Open retouren"
            source="api"
            href="/seller/returns"
            linkLabel="Retouren"
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Omzet per maand (periode)" wrapChildren={false}>
        <div className="mt-2 overflow-hidden rounded-lg border border-wf-300 bg-white">
          {revenueByMonth.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-wf-600">
              Geen omzet in deze periode.
            </p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {["Maand", "Omzet", "Aandeel"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenueByMonth.map(([month, revenue]) => {
                  const pct =
                    periodRevenue > 0
                      ? Math.round((revenue / periodRevenue) * 100)
                      : 0
                  return (
                    <tr
                      key={month}
                      className="border-b border-wf-200 last:border-b-0"
                    >
                      <td className="px-4 py-2.5 text-wf-800">{month}</td>
                      <td className="px-4 py-2.5 text-wf-800">
                        {formatEuro(revenue)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-wf-200">
                            <div
                              className="h-full bg-wf-800"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-wf-600">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DashboardSection>
    </SellerGate>
  )
}
