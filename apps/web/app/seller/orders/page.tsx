"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { formatEuro } from "../../_components/storefront-shell"
import {
  OrderServiceApiError,
  listSellerOrders,
} from "../../_lib/order-service-api"

export default function SellerOrdersPage() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listSellerOrders>>["orders"] | "loading" | "error"
  >("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSellerOrders()
      .then((res) => {
        if (!cancelled) setRows(res.orders)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setRows("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Orders laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Orders" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Orders</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Bestellingen van klanten bij jouw verkopersaccount.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {rows === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : rows === "error" || rows.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Nog geen orders.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-wf-600">
                <th className="py-2 pr-3 font-semibold">Order</th>
                <th className="py-2 pr-3 font-semibold">Klant</th>
                <th className="py-2 pr-3 font-semibold">Regels</th>
                <th className="py-2 pr-3 font-semibold">Bedrag</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 font-semibold">Retouren</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                let total = 0
                for (const line of item.lines) {
                  const unit =
                    typeof line.unit_price_snapshot === "number"
                      ? line.unit_price_snapshot
                      : Number(line.unit_price_snapshot)
                  if (Number.isFinite(unit)) total += unit * line.quantity
                }
                return (
                  <tr
                    key={item.order.id}
                    className="border-b border-wf-200 text-wf-800"
                  >
                    <td className="py-2.5 pr-3 font-medium">
                      #{item.order.order_number}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[10px]">
                      {item.order.customer_id.slice(0, 14)}…
                    </td>
                    <td className="py-2.5 pr-3">{item.lines.length}</td>
                    <td className="py-2.5 pr-3">
                      {formatEuro(Math.round(total * 100) / 100)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline">
                        {item.order.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      {item.returns.length > 0 ? (
                        <Link
                          href="/seller/returns"
                          className="font-semibold underline"
                        >
                          {item.returns.length} retour(en)
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
