"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import {
  OrderServiceApiError,
  listSellerOrders,
} from "../../_lib/order-service-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

type PaymentFilter = "all" | "Betaald" | "Betaling wordt verwerkt"
const PAGE_SIZE = 25

type SellerOrderRow = {
  id: string
  order_number: string
  created_at: string
  customer_label: string
  products_label: string
  total: number
  payment_status: string
  shipping_status: string
  promised_delivery_date: string | null
  promised_delivery_urgency: "due_tomorrow" | "overdue" | null
}

function lineTotal(
  lines: Array<{ quantity: number; unit_price_snapshot: string | number }>
) {
  return lines.reduce((sum, line) => {
    const unit = Number(line.unit_price_snapshot) || 0
    return sum + unit * line.quantity
  }, 0)
}

function productsLabel(
  lines: Array<{
    product_name?: string
    product_label?: string
    quantity: number
  }>
) {
  if (!lines.length) return "—"
  return lines
    .map((line) => {
      const name = line.product_name || line.product_label || "—"
      return line.quantity > 1 ? `${name} ×${line.quantity}` : name
    })
    .join(", ")
}

function shippingStatusLabel(status: string, locale: Parameters<typeof t>[1]) {
  if (status === "pending") return t("sellerShipStatusPending", locale)
  if (status === "shipped") return t("sellerShipStatusShipped", locale)
  if (status === "in_transit") return t("sellerShipStatusInTransit", locale)
  if (status === "out_for_delivery")
    return t("sellerShipStatusOutForDelivery", locale)
  if (status === "delivered") return t("sellerShipStatusDelivered", locale)
  if (status === "exception") return t("sellerShipStatusException", locale)
  return statusLabel(status, locale)
}

export default function SellerOrdersPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [rows, setRows] = useState<SellerOrderRow[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setError(null)
    listSellerOrders()
      .then((res) => {
        setRows(
          res.orders.map((item) => ({
            id: item.order.id,
            order_number: item.order.order_number,
            created_at: item.order.created_at,
            customer_label:
              item.order.customer_name ||
              item.order.customer_email ||
              item.order.customer_id,
            products_label: productsLabel(item.lines),
            total: lineTotal(item.lines),
            payment_status: item.order.payment_status,
            shipping_status: item.order.shipping_status ?? "pending",
            promised_delivery_date:
              item.order.promised_delivery_date ?? null,
            promised_delivery_urgency:
              item.order.promised_delivery_urgency ?? null,
          }))
        )
      })
      .catch((err: unknown) => {
        setRows([])
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("sellerOrdersEmptyDesc", locale)
        )
      })
  }, [locale])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (rows === "loading") return []
    const q = query.trim().toLowerCase()
    return rows.filter((item) => {
      if (paymentFilter !== "all" && item.payment_status !== paymentFilter)
        return false
      if (!q) return true
      return [
        item.order_number,
        item.customer_label,
        item.products_label,
        item.payment_status,
      ]
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
    t("sellerOrderProductsCol", locale),
    t("commonAmount", locale),
    t("sellerOrderPromisedDelivery", locale),
    t("sellerOrderShippingStatus", locale),
    t("sellerOrderPaymentStatus", locale),
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

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

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

      {rows === "loading" ? (
        <p className="text-xs text-wf-600">{t("loading", locale)}</p>
      ) : rows.length === 0 ? (
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
            <table className="w-full min-w-[980px] border-collapse text-left text-xs">
              <thead>
                <tr>
                  {headers.map((h, idx) => (
                    <th
                      key={`${h}-${idx}`}
                      className="border-b border-wf-400 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item) => {
                  const warn =
                    item.promised_delivery_urgency === "due_tomorrow" ||
                    item.promised_delivery_urgency === "overdue"
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-wf-200 text-wf-800 last:border-b-0"
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                        #{item.order_number}
                      </td>
                      <td className="px-3 py-2 text-wf-600 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString(intl)}
                      </td>
                      <td className="max-w-[9rem] truncate px-3 py-2">
                        {item.customer_label}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2">
                        <span className="line-clamp-2">{item.products_label}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatEuro(item.total)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.promised_delivery_date ? (
                          <span
                            className={
                              warn
                                ? "font-bold text-red-600"
                                : "text-wf-800"
                            }
                          >
                            {new Date(
                              `${item.promised_delivery_date}T12:00:00`
                            ).toLocaleDateString(intl)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {shippingStatusLabel(item.shipping_status, locale)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {statusLabel(item.payment_status, locale)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/seller/orders/${item.id}`}
                          className="font-semibold underline"
                        >
                          {t("commonOpen", locale)}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
