"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Input } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import { DEMO_ORDERS, type DemoOrder } from "../_lib/demo-data"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

type PaymentFilter = "all" | "Betaald" | "Betaling wordt verwerkt"
const PAGE_SIZE = 25

export default function SellerOrdersPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [rows] = useState<DemoOrder[]>(DEMO_ORDERS)
  const [query, setQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((item) => {
      if (paymentFilter !== "all" && item.payment_status !== paymentFilter)
        return false
      if (!q) return true
      return [item.order_number, item.customer_name, item.payment_status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [rows, query, paymentFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const headers = [
    t("commonOrder", locale),
    t("commonDate", locale),
    t("commonCustomer", locale),
    t("commonAmount", locale),
    t("commonStatus", locale),
    "",
  ]

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavOrders", locale) },
      ]}
    >
      <div className="mb-5">
        <h1 className="text-[19px] font-bold text-wf-900">
          {t("sellerNavOrders", locale)}
        </h1>
        <p className="mt-1.5 text-xs text-wf-600">
          {t("sellerOrdersIntro", locale)}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 items-end gap-2.5 tablet:grid-cols-[1fr_200px]">
        <Input
          label={t("commonSearch", locale)}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder={t("sellerOrdersSearchPlaceholder", locale)}
        />
        <div>
          <label
            htmlFor="payment-filter"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            {t("commonStatus", locale)}
          </label>
          <select
            id="payment-filter"
            className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value as PaymentFilter)
              setPage(1)
            }}
          >
            <option value="all">{t("commonAll", locale)}</option>
            <option value="Betaald">{statusLabel("Betaald", locale)}</option>
            <option value="Betaling wordt verwerkt">
              {statusLabel("Betaling wordt verwerkt", locale)}
            </option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={t("sellerOrdersEmptyTitle", locale)}
          description={t("sellerOrdersEmptyDesc", locale)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("commonEmptyFilter", locale)}
          description={t("sellerOrdersEmptyFilterHint", locale)}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h || "actie"}
                      className="border-b border-wf-400 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-wf-200 text-wf-800 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      #{item.order_number}
                    </td>
                    <td className="px-4 py-2.5 text-wf-600">
                      {new Date(item.created_at).toLocaleDateString(intl)}
                    </td>
                    <td className="px-4 py-2.5">{item.customer_name}</td>
                    <td className="px-4 py-2.5">{formatEuro(item.total)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">
                        {statusLabel(item.payment_status, locale)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/seller/orders/${item.id}`}
                        className="font-semibold underline"
                      >
                        {t("commonOpen", locale)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-wf-600">
            <span>
              {tFormat("sellerOrdersCount", locale, {
                from: (currentPage - 1) * PAGE_SIZE + 1,
                to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-[5px] border border-wf-400 bg-white px-3 py-1.5 text-xs disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("sellerOrdersPrev", locale)}
              </button>
              <span>
                {tFormat("commonPageOf", locale, {
                  current: currentPage,
                  total: pageCount,
                })}
              </span>
              <button
                type="button"
                className="rounded-[5px] border border-wf-400 bg-white px-3 py-1.5 text-xs disabled:opacity-40"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                {t("commonNext", locale)}
              </button>
            </div>
          </div>
        </>
      )}
    </SellerGate>
  )
}
