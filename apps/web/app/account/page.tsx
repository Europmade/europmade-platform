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

export default function BuyerDashboardPage() {
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
            : "Dashboard laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  const activeOrders =
    orders === "loading" || orders === "error"
      ? 0
      : orders.filter((o) => o.display_status === "Onderweg").length
  const recent =
    orders === "loading" || orders === "error" ? [] : orders.slice(0, 5)

  return (
    <BuyerGate
      breadcrumb={[
        { label: "Mijn EuropMade", href: "/account" },
        { label: "Dashboard" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Mijn EuropMade</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Overzicht van je recente activiteit.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-5 grid gap-3 tablet:grid-cols-3">
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">{activeOrders}</div>
          <div className="mt-1 text-[11px] text-wf-600">Actieve bestellingen</div>
          <Link
            href="/account/orders"
            className="mt-2 inline-block text-[11px] font-semibold text-wf-800 hover:underline"
          >
            ↳ Bekijk alle
          </Link>
        </div>
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">{openReturns}</div>
          <div className="mt-1 text-[11px] text-wf-600">Openstaande retour</div>
          <Link
            href="/account/returns"
            className="mt-2 inline-block text-[11px] font-semibold text-wf-800 hover:underline"
          >
            ↳ Bekijk status
          </Link>
        </div>
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">—</div>
          <div className="mt-1 text-[11px] text-wf-600">Nieuwe berichten</div>
          <span className="mt-2 inline-block text-[11px] text-wf-500">
            Volgt in S3-05-07
          </span>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-bold text-wf-900">Recente bestellingen</h2>
      {orders === "loading" ? (
        <p className="mt-3 text-xs text-wf-600">Laden…</p>
      ) : recent.length === 0 ? (
        <p className="mt-3 text-xs text-wf-600">Nog geen bestellingen.</p>
      ) : (
        <ul className="mt-3 divide-y divide-wf-200 rounded-md border border-wf-300">
          {recent.map((item) => (
            <li
              key={item.order.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
            >
              <span className="text-wf-800">
                Bestelling #{item.order.order_number} · {item.display_status}
              </span>
              <Link
                href={`/account/orders/${item.order.id}`}
                className="font-semibold text-wf-900 hover:underline"
              >
                Bekijken →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BuyerGate>
  )
}
