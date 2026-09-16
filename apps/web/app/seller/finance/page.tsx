"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { KpiCard } from "../_components/kpi-card"
import { DashboardSection } from "../_components/dashboard-section"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

type SellerInvoice = {
  id: string
  invoice_number: string
  invoice_date: string
  period_start: string
  period_end: string
  subtotal: number
  vat_amount: number
  total: number
  status: string
  pdf_url: string | null
}

type Sale = {
  order_id: string
  order_number: string
  date: string
  product: string
  quantity: number
  sales_value: number
  commission_pct: number | null
  commission_amount: number | null
  order_status: string
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

async function apiFetch(path: string, opts?: RequestInit) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
    ...(opts?.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${medusaBackendUrl()}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  })
  if (!res.ok) return null
  return res.json()
}

export default function SellerFinanceDashboardPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [overview, setOverview] = useState<any>(null)
  const [invoices, setInvoices] = useState<SellerInvoice[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch("/store/finance/seller"),
      apiFetch("/store/finance/seller/invoices"),
      apiFetch("/store/finance/seller/sales"),
    ]).then(([ov, inv, sal]) => {
      setOverview(ov)
      setInvoices(inv?.invoices ?? [])
      setSales(sal?.sales ?? [])
      setLoading(false)
    })
  }, [])

  const summary = overview?.summary
  const adCost = summary?.advertising_total ?? 0

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        { label: t("sellerNavFinance", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerNavFinance", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerFinanceIntro", locale)}
      </p>

      {/* KPI cards */}
      <DashboardSection title={t("commonOverview", locale)} wrapChildren={false}>
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          <KpiCard
            emphasis="primary"
            value={formatEuro(summary?.net_revenue ?? 0)}
            label={t("sellerFinanceAvailableBalance", locale)}
            source="api"
          />
          <KpiCard
            value={formatEuro(summary?.next_payout_amount ?? 0)}
            label={t("sellerFinanceNextPayout", locale)}
            source="api"
            href="/seller/finance/uitbetalingen"
            linkLabel={t("sellerFinancePayouts", locale)}
          />
          <KpiCard
            value={formatEuro(summary?.commission_held ?? 0)}
            label={t("sellerFinanceOpenCommissions", locale)}
            source="api"
            href="/seller/finance/commissie"
            linkLabel={t("sellerFinanceCommission", locale)}
          />
          <KpiCard
            value={formatEuro(adCost)}
            label={t("sellerFinanceAdvertisingCosts", locale)}
            source="api"
            href="/seller/finance/facturen"
            linkLabel={t("sellerFinanceEuropmadeInvoices", locale)}
          />
        </div>
      </DashboardSection>

      {/* EuropMade invoices section */}
      <DashboardSection
        title={t("sellerFinanceEuropmadeInvoices", locale)}
        wrapChildren={false}
      >
        <p className="mt-1 text-xs text-wf-500">
          {t("sellerFinanceEuropmadeInvoicesDesc", locale)}
        </p>
        {invoices.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={t("sellerFinanceEuropmadeInvoicesEmpty", locale)}
              description=""
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("sellerFinanceInvoiceNumber", locale),
                    t("sellerFinanceInvoiceDate", locale),
                    t("sellerFinancePeriod", locale),
                    t("sellerFinanceExclVat", locale),
                    t("sellerFinanceVat", locale),
                    t("sellerFinanceTotal", locale),
                    t("commonStatus", locale),
                    "",
                  ].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-wf-200 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-wf-800">
                      <Link
                        href={`/seller/finance/facturen/${inv.id}`}
                        className="underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {new Date(inv.invoice_date).toLocaleDateString(intl)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {new Date(inv.period_start).toLocaleDateString(intl)} –{" "}
                      {new Date(inv.period_end).toLocaleDateString(intl)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(inv.subtotal)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(inv.vat_amount)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-wf-800">
                      {formatEuro(inv.total)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">
                        {statusLabel(inv.status, locale)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 space-x-2">
                      <Link
                        href={`/seller/finance/facturen/${inv.id}`}
                        className="text-[11px] text-wf-800 underline"
                      >
                        {t("sellerFinanceDownloadInvoicePdf", locale)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>

      {/* Sales overview section */}
      <DashboardSection
        title={t("sellerFinanceSalesOverview", locale)}
        wrapChildren={false}
      >
        <p className="mt-1 text-xs text-wf-500">
          {t("sellerFinanceSalesOverviewDesc", locale)}
        </p>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded bg-wf-900 px-3 py-1.5 text-[11px] font-medium text-white"
            onClick={async () => {
              const res = await fetch(
                `${medusaBackendUrl()}/store/finance/seller/sales?format=csv`,
                {
                  credentials: "include",
                  headers: {
                    ...(PUBLISHABLE_KEY
                      ? { "x-publishable-api-key": PUBLISHABLE_KEY }
                      : {}),
                  },
                }
              )
              if (!res.ok) return
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = "sales-overview.csv"
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            {t("sellerFinanceDownloadSales", locale)}
          </button>
        </div>
        {sales.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={t("sellerFinanceSalesEmpty", locale)}
              description=""
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("commonOrder", locale),
                    t("commonDate", locale),
                    t("sellerFinanceProduct", locale),
                    t("sellerFinanceQuantity", locale),
                    t("sellerFinanceSalesValue", locale),
                    t("sellerFinanceCommissionPct", locale),
                    t("sellerFinanceCommissionAmount", locale),
                    t("sellerFinanceOrderStatus", locale),
                  ].map((h) => (
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
                {sales.slice(0, 50).map((s) => (
                  <tr
                    key={s.order_id}
                    className="border-b border-wf-200 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-wf-800">
                      {s.order_number}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {new Date(s.date).toLocaleDateString(intl)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-wf-700">
                      {s.product}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">{s.quantity}</td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(s.sales_value)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {s.commission_pct != null
                        ? `${(s.commission_pct * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {s.commission_amount != null
                        ? formatEuro(s.commission_amount)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">
                        {statusLabel(s.order_status, locale)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>

      {/* Shortcuts */}
      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("commonShortcuts", locale)}
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          {[
            {
              label: t("sellerFinanceCommissionOverview", locale),
              href: "/seller/finance/commissie",
            },
            {
              label: t("sellerFinanceDownloadInvoices", locale),
              href: "/seller/finance/facturen",
            },
            {
              label: "Settlements",
              href: "/seller/finance/settlements",
            },
            {
              label: t("sellerFinancePayouts", locale),
              href: "/seller/finance/uitbetalingen",
            },
            {
              label: t("sellerFinanceVatOss", locale),
              href: "/seller/finance/btw",
            },
          ].map((item, index, arr) => (
            <div
              key={item.href}
              className={`flex items-center justify-between px-4 py-3 text-xs text-wf-700 ${
                index < arr.length - 1 ? "border-b border-wf-200" : ""
              }`}
            >
              <span>{item.label}</span>
              <Link
                href={item.href}
                className="text-[11px] text-wf-800 underline"
              >
                {t("commonViewArrow", locale)}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </SellerGate>
  )
}
