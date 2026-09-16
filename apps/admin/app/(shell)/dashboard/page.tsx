"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { KpiCard } from "../../../components/kpi-card"
import { PeriodFilter } from "../../../components/period-filter"
import {
  loadAdminDashboard,
  type AdminDashboardData,
  type AdCampaignRow,
  type DashboardMetric,
  type ProductQueueRow,
  type RecentOrderRow,
  type SellerQueueRow,
} from "../../../lib/dashboard-api"
import {
  buildControlCenterPlatformKpis,
  CONTROL_CENTER_PERIOD_OPTIONS,
  PLATFORM_KPI_DISPLAY,
} from "../../../lib/control-center"
import type { PeriodKey } from "../../../lib/period"

/**
 * P2.21 — Admin Control Center 2.0
 * Eén operationeel overzicht; geen dubbele marketplace/finance-widgets.
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

  const platformKpis = useMemo(() => {
    if (!data) return null
    return buildControlCenterPlatformKpis(
      {
        sellersOk: data.sources.partners,
        activeSellersOk: data.sources.activeSellers,
        sellerQueueOk: data.sources.sellerQueue,
        productsOk: data.sources.products,
        productApprovalsOk: data.sources.productApprovals,
        ordersOk: data.sources.orders,
        payoutsOk: data.sources.payouts,
        totalSellers: data.platform.totalSellers.numeric,
        activeSellers: data.platform.activeSellers.numeric,
        pendingSellerApprovals: data.platform.pendingSellerApprovals.numeric,
        totalProducts: data.platform.totalProducts.numeric,
        pendingProductApprovals: data.platform.pendingProductApprovals.numeric,
        openPayouts: data.platform.openPayouts.numeric,
        orders: data.financeSource.orders,
      },
      period
    )
  }, [data, period])

  if (error) {
    return <Notice variant="warning">{error}</Notice>
  }

  if (!data || !platformKpis) {
    return (
      <div>
        <h1 className="text-[19px] font-bold text-wf-900">Control Center</h1>
        <p className="mt-3 text-xs text-wf-600">Dashboard laden…</p>
      </div>
    )
  }

  const periodLabel =
    CONTROL_CENTER_PERIOD_OPTIONS.find((o) => o.key === period)?.label ??
    period

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">Control Center</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Overzicht van de belangrijkste EuropMade-platformactiviteiten.
          </p>
        </div>
        <PeriodFilter
          value={period}
          onChange={setPeriod}
          options={CONTROL_CENTER_PERIOD_OPTIONS}
        />
      </div>

      <p className="mb-5 text-[10.5px] text-wf-500">
        Periode: <span className="font-medium text-wf-700">{periodLabel}</span>
      </p>

      {!data.backendReachable ? (
        <Notice variant="warning" className="mb-5">
          Backend niet bereikbaar. KPI&apos;s tonen beschikbare waarden of —.
        </Notice>
      ) : null}

      {/* B. Platform KPI's */}
      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Platform KPI&apos;s
        </h2>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          {PLATFORM_KPI_DISPLAY.map((def) => {
            const metric = platformKpis[def.id]
            return (
              <KpiCard
                key={def.id}
                value={metric.value}
                label={
                  def.lifetime ? `${def.label} (lifetime)` : def.label
                }
                href={metric.href}
                source={metric.source}
                note={metric.note}
                periodKey={period}
                valueFormat={def.format ?? "number"}
              />
            )
          })}
        </div>
      </section>

      {/* C. Aandacht vereist */}
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
                key={`${item.href}-${item.description}`}
                className="flex items-center justify-between gap-3 border-b border-wf-200 px-[18px] py-3 text-xs text-wf-700 last:border-b-0"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="inline-block rounded-full border border-wf-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.03em]">
                    {item.status}
                  </span>
                  <span className="font-semibold text-wf-900">{item.count}</span>
                  <span>{item.description}</span>
                </span>
                <Link
                  href={item.href}
                  className="shrink-0 text-[11px] font-medium text-wf-800 underline"
                >
                  Openen →
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* D–G: Orders, Sellers, Products, Advertising */}
      <div className="mb-8 grid grid-cols-1 gap-6 desktop:grid-cols-2">
        <OrdersPanel
          rows={data.controlCenter.recentOrders}
          available={data.sources.orders}
        />
        <SellersPanel
          rows={data.controlCenter.pendingSellerApplications}
          available={data.sources.sellerQueue}
        />
        <ProductsPanel
          rows={data.controlCenter.pendingProductApprovals}
          available={data.sources.productApprovals}
        />
        <AdvertisingPanel
          rows={data.controlCenter.pendingAdCampaigns}
          available={data.sources.ads}
        />
      </div>

      {/* H. Finance + I. Moderatie */}
      <div className="mb-8 grid grid-cols-1 gap-6 desktop:grid-cols-2">
        <FinancePanel snapshot={data.financeSnapshot} />
        <ModerationPanel snapshot={data.moderationSnapshot} />
      </div>

      {/* J. Systeemstatus */}
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

function PanelHeader({
  title,
  href,
}: {
  title: string
  href: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-wf-200 px-4 py-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-wf-700">
        {title}
      </h2>
      <Link href={href} className="text-[11px] text-wf-800 underline">
        Alle
      </Link>
    </div>
  )
}

function OrdersPanel({
  rows,
  available,
}: {
  rows: RecentOrderRow[]
  available: boolean
}) {
  return (
    <ActivityPanel title="Recente orders" href="/orders">
      {!available ? (
        <p className="px-4 py-4 text-xs text-wf-600">
          Ordergegevens niet beschikbaar.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-4 text-xs text-wf-600">Geen orders gevonden.</p>
      ) : (
        rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="block border-b border-wf-200 px-4 py-3 text-xs last:border-b-0 hover:bg-wf-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-wf-900">{row.orderNumber}</p>
                <p className="mt-0.5 text-[11px] text-wf-500">
                  {new Date(row.date).toLocaleDateString("nl-NL")}
                </p>
                <p className="mt-1 text-wf-700">{row.sellerLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-wf-800">{row.amount}</p>
                <p className="mt-0.5 text-[11px] text-wf-500">{row.status}</p>
              </div>
            </div>
          </Link>
        ))
      )}
    </ActivityPanel>
  )
}

function SellersPanel({
  rows,
  available,
}: {
  rows: SellerQueueRow[]
  available: boolean
}) {
  return (
    <ActivityPanel title="Nieuwe seller-aanvragen" href="/partners">
      {!available ? (
        <p className="px-4 py-4 text-xs text-wf-600">
          Seller-aanvragen niet beschikbaar.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-4 text-xs text-wf-600">
          Geen openstaande seller-aanvragen.
        </p>
      ) : (
        rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="flex items-center justify-between gap-3 border-b border-wf-200 px-4 py-3 text-xs text-wf-700 last:border-b-0 hover:bg-wf-50"
          >
            <div>
              <p className="font-medium text-wf-800">{row.companyName}</p>
              <p className="mt-0.5 text-[11px] text-wf-500">{row.status}</p>
            </div>
            <p className="text-[10px] text-wf-500">
              {new Date(row.date).toLocaleDateString("nl-NL")}
            </p>
          </Link>
        ))
      )}
    </ActivityPanel>
  )
}

function ProductsPanel({
  rows,
  available,
}: {
  rows: ProductQueueRow[]
  available: boolean
}) {
  return (
    <ActivityPanel
      title="Producten wachtend op goedkeuring"
      href="/product-cloud/products/approvals"
    >
      {!available ? (
        <p className="px-4 py-4 text-xs text-wf-600">
          Productgoedkeuring niet beschikbaar.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-4 text-xs text-wf-600">
          Geen producten wachten op goedkeuring.
        </p>
      ) : (
        rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="flex items-center justify-between gap-3 border-b border-wf-200 px-4 py-3 text-xs text-wf-700 last:border-b-0 hover:bg-wf-50"
          >
            <div>
              <p className="font-medium text-wf-800">{row.productName}</p>
              <p className="mt-0.5 text-[11px] text-wf-500">
                {row.sellerLabel} · {row.status}
              </p>
            </div>
            {row.date ? (
              <p className="text-[10px] text-wf-500">
                {new Date(row.date).toLocaleDateString("nl-NL")}
              </p>
            ) : null}
          </Link>
        ))
      )}
    </ActivityPanel>
  )
}

function AdvertisingPanel({
  rows,
  available,
}: {
  rows: AdCampaignRow[]
  available: boolean
}) {
  return (
    <ActivityPanel
      title="Openstaande advertising-campagnes"
      href="/advertising/campaigns"
    >
      {!available ? (
        <p className="px-4 py-4 text-xs text-wf-600">
          Advertisinggegevens niet beschikbaar.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-4 text-xs text-wf-600">
          Geen campagnes in beoordeling.
        </p>
      ) : (
        rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="block border-b border-wf-200 px-4 py-3 text-xs last:border-b-0 hover:bg-wf-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-wf-800">{row.name}</p>
                <p className="mt-0.5 text-[11px] text-wf-500">
                  {row.sellerLabel} · {row.placement}
                </p>
                <p className="mt-0.5 text-[10px] text-wf-500">
                  {row.periodLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-wf-800">{row.amount}</p>
                <p className="mt-0.5 text-[11px] text-wf-500">{row.status}</p>
              </div>
            </div>
          </Link>
        ))
      )}
    </ActivityPanel>
  )
}

function FinancePanel({
  snapshot,
}: {
  snapshot: AdminDashboardData["financeSnapshot"]
}) {
  const items: Array<{ label: string; metric: DashboardMetric }> = [
    { label: "Open payouts", metric: snapshot.openPayoutCount },
    { label: "Totaal open payout-bedrag", metric: snapshot.openPayoutAmount },
    { label: "Advertising omzet", metric: snapshot.advertisingRevenue },
    { label: "Open commissies", metric: snapshot.openCommissions },
    { label: "Openstaande facturen", metric: snapshot.openInvoices },
  ]

  return (
    <section className="overflow-hidden rounded-lg border border-wf-300 bg-white">
      <PanelHeader title="Finance" href="/finance" />
      <div className="divide-y divide-wf-200">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-3 px-4 py-3 text-xs"
          >
            <div>
              <p className="text-wf-600">{item.label}</p>
              {item.metric.source === "unavailable" && item.metric.note ? (
                <p className="mt-0.5 text-[10px] text-wf-500">{item.metric.note}</p>
              ) : null}
            </div>
            <p className="font-semibold text-wf-900">{item.metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ModerationPanel({
  snapshot,
}: {
  snapshot: AdminDashboardData["moderationSnapshot"]
}) {
  const items: Array<{ label: string; metric: DashboardMetric }> = [
    { label: "Open moderatiezaken", metric: snapshot.openCases },
    { label: "Fraudesignalen", metric: snapshot.fraudSignals },
    { label: "Geschillen / claims", metric: snapshot.disputes },
  ]

  return (
    <section className="overflow-hidden rounded-lg border border-wf-300 bg-white">
      <PanelHeader title="Moderatie" href="/moderation" />
      <div className="divide-y divide-wf-200">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-3 px-4 py-3 text-xs"
          >
            <div>
              <p className="text-wf-600">{item.label}</p>
              {item.metric.source === "unavailable" && item.metric.note ? (
                <p className="mt-0.5 text-[10px] text-wf-500">{item.metric.note}</p>
              ) : null}
            </div>
            <p className="font-semibold text-wf-900">{item.metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ActivityPanel({
  title,
  href,
  children,
}: {
  title: string
  href: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-wf-300 bg-white">
      <PanelHeader title={title} href={href} />
      {children}
    </section>
  )
}
