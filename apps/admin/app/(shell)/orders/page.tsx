"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  OrderAdminApiError,
  listAdminOrders,
  type AdminOrderListItem,
} from "../../../lib/order-admin-api"

function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace(".", ",")}`
}

export default function OrderManagementOverviewPage() {
  const [tab, setTab] = useState<"all" | "exceptions">("all")
  const [rows, setRows] = useState<AdminOrderListItem[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setRows("loading")
    listAdminOrders(tab === "exceptions")
      .then((res) => {
        if (!cancelled) setRows(res.orders)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderAdminApiError
            ? err.message
            : "Orders laden mislukt."
        )
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [tab])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">
        Order Management Center
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Uitsluitend-lezend overzicht van geplaatste orders. Geen
        betaling-/fulfilment-/retouracties in dit scherm.
      </p>

      <div className="mt-4 flex gap-2 border-b border-wf-200 pb-2">
        {(
          [
            ["all", "Alle orders"],
            ["exceptions", "Uitzonderingen"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              tab === key
                ? "border-b-2 border-wf-900 px-2 pb-2 text-xs font-semibold"
                : "px-2 pb-2 text-xs text-wf-600"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {rows === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Geen orders in dit filter.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-wf-600">
                <th className="py-2 pr-3 font-semibold">Order</th>
                <th className="py-2 pr-3 font-semibold">Betaling</th>
                <th className="py-2 pr-3 font-semibold">Bedrag</th>
                <th className="py-2 pr-3 font-semibold">Uitzondering</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.order.id}
                  className="border-b border-wf-200 text-wf-800"
                >
                  <td className="py-2.5 pr-3 font-medium">
                    #{item.order.order_number}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline">
                      {item.order.payment_status}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3">
                    {formatEuro(item.order_total)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {item.order.exception_status ?? "—"}
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/orders/${item.order.id}`}
                      className="font-semibold underline"
                    >
                      Bekijken
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
