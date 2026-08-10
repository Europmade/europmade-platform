"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { BuyerGate } from "./_components/buyer-gate"
import {
  OrderServiceApiError,
  listOrders,
  listReturns,
  type BuyerOrderListItem,
} from "../_lib/order-service-api"
import { useStorefrontLocale } from "../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../_lib/i18n/messages"
import { statusLabel } from "../_lib/i18n/status-labels"

export default function BuyerDashboardPage() {
  const locale = useStorefrontLocale()
  const [orders, setOrders] = useState<BuyerOrderListItem[] | "loading" | "error">(
    "loading"
  )
  const [openReturns, setOpenReturns] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listOrders(), listReturns()])
      .then(([orderRes, returnRes]) => {
        if (cancelled) return
        setOrders(orderRes.orders)
        setOpenReturns(
          returnRes.returns.filter((r) =>
            ["Aangevraagd", "Bevestigd", "Ontvangen", "Geëscaleerd"].includes(
              r.status
            )
          ).length
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setOrders("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("buyerDashboardLoadError", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const activeOrders =
    orders === "loading" || orders === "error"
      ? 0
      : orders.filter((o) => o.display_status === "Onderweg").length
  const recent =
    orders === "loading" || orders === "error" ? [] : orders.slice(0, 5)

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavDashboard", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("buyerPortalTitle", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("buyerDashboardIntro", locale)}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-5 grid gap-3 tablet:grid-cols-3">
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">{activeOrders}</div>
          <div className="mt-1 text-[11px] text-wf-600">
            {t("buyerActiveOrders", locale)}
          </div>
          <Link
            href="/account/orders"
            className="mt-2 inline-block text-[11px] font-semibold text-wf-800 hover:underline"
          >
            {t("buyerViewAll", locale)}
          </Link>
        </div>
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">{openReturns}</div>
          <div className="mt-1 text-[11px] text-wf-600">
            {t("buyerOpenReturns", locale)}
          </div>
          <Link
            href="/account/returns"
            className="mt-2 inline-block text-[11px] font-semibold text-wf-800 hover:underline"
          >
            {t("buyerViewStatus", locale)}
          </Link>
        </div>
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">—</div>
          <div className="mt-1 text-[11px] text-wf-600">
            {t("buyerNewMessages", locale)}
          </div>
          <span className="mt-2 inline-block text-[11px] text-wf-500">
            {t("buyerComingLater", locale)}
          </span>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-bold text-wf-900">
        {t("buyerRecentOrders", locale)}
      </h2>
      {orders === "loading" ? (
        <p className="mt-3 text-xs text-wf-600">{t("loading", locale)}</p>
      ) : recent.length === 0 ? (
        <p className="mt-3 text-xs text-wf-600">{t("buyerNoOrders", locale)}</p>
      ) : (
        <ul className="mt-3 divide-y divide-wf-200 rounded-md border border-wf-300">
          {recent.map((item) => (
            <li
              key={item.order.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
            >
              <span className="text-wf-800">
                {tFormat("buyerOrderLabel", locale, {
                  number: item.order.order_number,
                  status: statusLabel(item.display_status, locale),
                })}
              </span>
              <Link
                href={`/account/orders/${item.order.id}`}
                className="font-semibold text-wf-900 hover:underline"
              >
                {t("buyerView", locale)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BuyerGate>
  )
}
