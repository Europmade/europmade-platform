"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Input, Notice } from "@europmade/ui"
import { BuyerGate } from "../_components/buyer-gate"
import { formatEuro } from "../../_components/storefront-shell"
import {
  OrderServiceApiError,
  listOrders,
  type BuyerOrderListItem,
} from "../../_lib/order-service-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

type Tab = "Alle" | "Onderweg" | "Geleverd" | "Retour"

function dateLocale(locale: StorefrontLocale): string {
  if (locale === "en") return "en-GB"
  if (locale === "de") return "de-DE"
  if (locale === "fr") return "fr-FR"
  return "nl-NL"
}

function formatDate(iso: string, locale: StorefrontLocale): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(dateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function badgeVariant(status: string): "solid" | "outline" {
  if (status === "Geleverd") return "solid"
  return "outline"
}

function tabLabel(tab: Tab, locale: StorefrontLocale): string {
  if (tab === "Alle") return t("commonAll", locale)
  if (tab === "Retour") return t("buyerTabReturn", locale)
  return statusLabel(tab, locale)
}

export default function BuyerOrdersPage() {
  const locale = useStorefrontLocale()
  const [orders, setOrders] = useState<BuyerOrderListItem[] | "loading" | "error">(
    "loading"
  )
  const [tab, setTab] = useState<Tab>("Alle")
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listOrders()
      .then((res) => {
        if (!cancelled) setOrders(res.orders)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setOrders("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("buyerOrdersLoadError", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const counts = useMemo(() => {
    if (orders === "loading" || orders === "error") {
      return { Alle: 0, Onderweg: 0, Geleverd: 0, Retour: 0 }
    }
    return {
      Alle: orders.length,
      Onderweg: orders.filter((o) => o.display_status === "Onderweg").length,
      Geleverd: orders.filter((o) => o.display_status === "Geleverd").length,
      Retour: orders.filter((o) => o.display_status.includes("Retour")).length,
    }
  }, [orders])

  const filtered = useMemo(() => {
    if (orders === "loading" || orders === "error") return []
    let list = orders
    if (tab === "Onderweg") {
      list = list.filter((o) => o.display_status === "Onderweg")
    } else if (tab === "Geleverd") {
      list = list.filter((o) => o.display_status === "Geleverd")
    } else if (tab === "Retour") {
      list = list.filter((o) => o.display_status.includes("Retour"))
    }
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((o) => {
      const hay = [
        o.order.order_number,
        o.seller_name,
        ...o.lines.map((l) => l.offer_id),
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [orders, tab, query])

  const tabs: Tab[] = ["Alle", "Onderweg", "Geleverd", "Retour"]

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavOrders", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("buyerNavOrders", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("buyerOrdersIntro", locale)}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-b border-wf-200 pb-2">
        {tabs.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={
              tab === tabKey
                ? "border-b-2 border-wf-900 px-2 pb-2 text-xs font-semibold text-wf-900"
                : "px-2 pb-2 text-xs text-wf-600 hover:text-wf-900"
            }
          >
            {tabLabel(tabKey, locale)}{" "}
            <span className="text-wf-500">({counts[tabKey]})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-md">
        <Input
          label={t("commonSearch", locale)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("buyerOrdersSearchPlaceholder", locale)}
        />
      </div>

      {orders === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">{t("loading", locale)}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-wf-600">
                <th className="py-2 pr-3 font-semibold">
                  {t("commonOrder", locale)}
                </th>
                <th className="py-2 pr-3 font-semibold">
                  {t("commonSeller", locale)}
                </th>
                <th className="py-2 pr-3 font-semibold">
                  {t("commonDate", locale)}
                </th>
                <th className="py-2 pr-3 font-semibold">
                  {t("commonAmount", locale)}
                </th>
                <th className="py-2 pr-3 font-semibold">
                  {t("commonStatus", locale)}
                </th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.order.id}
                  className="border-b border-wf-200 text-wf-800"
                >
                  <td className="py-2.5 pr-3 font-medium">
                    #{item.order.order_number}
                  </td>
                  <td className="py-2.5 pr-3">{item.seller_name}</td>
                  <td className="py-2.5 pr-3">
                    {formatDate(item.order.created_at, locale)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {formatEuro(item.order_total)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={badgeVariant(item.display_status)}>
                      {statusLabel(item.display_status, locale)}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/account/orders/${item.order.id}`}
                      className="font-semibold text-wf-900 hover:underline"
                    >
                      {t("commonView", locale)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="mt-4 text-xs text-wf-600">
              {t("buyerOrdersEmptyFilter", locale)}
            </p>
          ) : null}
        </div>
      )}
    </BuyerGate>
  )
}
