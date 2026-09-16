"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  OrderAdminApiError,
  listAdminOrders,
  shippingStatusLabel,
  type AdminOrderListItem,
} from "../../../lib/order-admin-api"

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const PAGE_SIZE = 25

/**
 * Order Management Center — platformbreed (alle sellers).
 * Data via dezelfde enrichment als Seller Orders.
 */
export default function OrderManagementOverviewPage() {
  const [rows, setRows] = useState<AdminOrderListItem[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [payment, setPayment] = useState("")
  const [shipping, setShipping] = useState("")
  const [returnStatus, setReturnStatus] = useState("")
  const [sellerId, setSellerId] = useState("")
  const [exceptionsOnly, setExceptionsOnly] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    setRows("loading")
    listAdminOrders({
      exception: exceptionsOnly,
      q: q.trim() || undefined,
      payment_status: payment || undefined,
      shipping_status: shipping || undefined,
      return_status: returnStatus || undefined,
      seller_id: sellerId.trim() || undefined,
    })
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
  }, [q, payment, shipping, returnStatus, sellerId, exceptionsOnly])

  const pageRows = useMemo(() => {
    if (rows === "loading") return []
    return rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  }, [rows, page])

  const totalPages =
    rows === "loading" ? 0 : Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">
        Order Management Center
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Alle platformorders. Zelfde orderinformatie als Seller Orders, met
        platformbrede filters. Read-only behalve uitzonderingen.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => {
            setPage(0)
            setQ(e.target.value)
          }}
          placeholder="Zoek order, klant, seller, product…"
          className="h-9 min-w-[220px] flex-1 rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        />
        <input
          value={sellerId}
          onChange={(e) => {
            setPage(0)
            setSellerId(e.target.value)
          }}
          placeholder="Seller ID"
          className="h-9 w-[160px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        />
        <select
          value={payment}
          onChange={(e) => {
            setPage(0)
            setPayment(e.target.value)
          }}
          className="h-9 rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
        >
          <option value="">Alle betalingen</option>
          <option value="Betaald">Betaald</option>
          <option value="Betaling wordt verwerkt">Betaling wordt verwerkt</option>
        </select>
        <select
          value={shipping}
          onChange={(e) => {
            setPage(0)
            setShipping(e.target.value)
          }}
          className="h-9 rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
        >
          <option value="">Alle verzending</option>
          <option value="pending">In afwachting</option>
          <option value="shipped">Verzonden</option>
          <option value="in_transit">Onderweg</option>
          <option value="delivered">Afgeleverd</option>
          <option value="exception">Uitzondering</option>
        </select>
        <select
          value={returnStatus}
          onChange={(e) => {
            setPage(0)
            setReturnStatus(e.target.value)
          }}
          className="h-9 rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
        >
          <option value="">Alle retouren</option>
          <option value="open">Open retouren</option>
          <option value="Aangevraagd">Aangevraagd</option>
          <option value="Geëscaleerd">Geëscaleerd</option>
          <option value="Verwerkt">Verwerkt</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-wf-700">
          <input
            type="checkbox"
            checked={exceptionsOnly}
            onChange={(e) => {
              setPage(0)
              setExceptionsOnly(e.target.checked)
            }}
          />
          Alleen uitzonderingen
        </label>
      </div>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {rows === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Geen orders gevonden.</p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-wf-500">
            {rows.length} order{rows.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-wf-300 text-wf-600">
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 pr-3 font-semibold">Datum</th>
                  <th className="py-2 pr-3 font-semibold">Klant</th>
                  <th className="py-2 pr-3 font-semibold">Seller</th>
                  <th className="py-2 pr-3 font-semibold">Product</th>
                  <th className="py-2 pr-3 font-semibold">Aantal</th>
                  <th className="py-2 pr-3 font-semibold">Bedrag</th>
                  <th className="py-2 pr-3 font-semibold">Betaling</th>
                  <th className="py-2 pr-3 font-semibold">Verzending</th>
                  <th className="py-2 pr-3 font-semibold">Retour</th>
                  <th className="py-2 pr-3 font-semibold">Uitzondering</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item) => (
                  <tr
                    key={item.order.id}
                    className="border-b border-wf-200 text-wf-800"
                  >
                    <td className="py-2.5 pr-3 font-medium">
                      {item.order.order_number}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {formatDate(item.order.created_at)}
                    </td>
                    <td className="py-2.5 pr-3">
                      {item.order.customer_name ||
                        item.order.customer_email ||
                        item.order.customer_id}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/partners/${item.order.seller_id}`}
                        className="underline"
                      >
                        {item.seller?.name ?? item.order.seller_id}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">
                      {item.product_summary ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {item.quantity_total ?? item.line_count}
                    </td>
                    <td className="py-2.5 pr-3">
                      {formatEuro(item.order_total)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline">
                        {item.order.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      {shippingStatusLabel(item.order.shipping_status)}
                    </td>
                    <td className="py-2.5 pr-3">
                      {item.return_status ?? "—"}
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
          <div className="mt-3 flex items-center gap-3 text-xs">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="underline disabled:opacity-40"
            >
              Vorige
            </button>
            <span>
              Pagina {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="underline disabled:opacity-40"
            >
              Volgende
            </button>
          </div>
        </>
      )}
    </div>
  )
}
