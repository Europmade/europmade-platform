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

type Tab = "Alle" | "Onderweg" | "Geleverd" | "Retour"

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function badgeVariant(status: string): "solid" | "outline" {
  if (status === "Geleverd") return "solid"
  return "outline"
}

export default function BuyerOrdersPage() {
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
            : "Bestellingen laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

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
        { label: "Mijn EuropMade", href: "/account" },
        { label: "Mijn bestellingen" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Mijn bestellingen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Overzicht van al je bestellingen bij verschillende verkopers.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-b border-wf-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "border-b-2 border-wf-900 px-2 pb-2 text-xs font-semibold text-wf-900"
                : "px-2 pb-2 text-xs text-wf-600 hover:text-wf-900"
            }
          >
            {t}{" "}
            <span className="text-wf-500">({counts[t]})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-md">
        <Input
          label="Zoeken"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op ordernummer of product…"
        />
      </div>

      {orders === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-wf-600">
                <th className="py-2 pr-3 font-semibold">Order</th>
                <th className="py-2 pr-3 font-semibold">Verkoper</th>
                <th className="py-2 pr-3 font-semibold">Datum</th>
                <th className="py-2 pr-3 font-semibold">Bedrag</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
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
                    {formatDate(item.order.created_at)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {formatEuro(item.order_total)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={badgeVariant(item.display_status)}>
                      {item.display_status}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/account/orders/${item.order.id}`}
                      className="font-semibold text-wf-900 hover:underline"
                    >
                      Bekijken
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="mt-4 text-xs text-wf-600">Geen bestellingen in dit filter.</p>
          ) : null}
        </div>
      )}
    </BuyerGate>
  )
}
