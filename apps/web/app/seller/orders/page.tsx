"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Input } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import { DEMO_ORDERS, type DemoOrder } from "../_lib/demo-data"

type PaymentFilter = "all" | "Betaald" | "Betaling wordt verwerkt"
const PAGE_SIZE = 25

export default function SellerOrdersPage() {
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

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Orders" },
      ]}
    >
      <div className="mb-5">
        <h1 className="text-[19px] font-bold text-wf-900">Orders</h1>
        <p className="mt-1.5 text-xs text-wf-600">
          Bestellingen van klanten bij jouw verkopersaccount.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 items-end gap-2.5 tablet:grid-cols-[1fr_200px]">
        <Input
          label="Zoeken"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Zoek op ordernummer of klant…"
        />
        <div>
          <label
            htmlFor="payment-filter"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            Status
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
            <option value="all">Alle</option>
            <option value="Betaald">Betaald</option>
            <option value="Betaling wordt verwerkt">
              Betaling wordt verwerkt
            </option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Geen orders"
          description="Zodra klanten bestellen bij jouw winkel, verschijnen orders hier."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Geen resultaten"
          description="Pas je zoekopdracht of statusfilter aan."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr>
                  {["Order", "Datum", "Klant", "Bedrag", "Status", ""].map(
                    (h) => (
                      <th
                        key={h || "actie"}
                        className="border-b border-wf-400 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                      >
                        {h}
                      </th>
                    )
                  )}
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
                      {new Date(item.created_at).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-2.5">{item.customer_name}</td>
                    <td className="px-4 py-2.5">{formatEuro(item.total)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">{item.payment_status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/seller/orders/${item.id}`}
                        className="font-semibold underline"
                      >
                        Openen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-wf-600">
            <span>
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} van{" "}
              {filtered.length} orders
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-[5px] border border-wf-400 bg-white px-3 py-1.5 text-xs disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Vorige
              </button>
              <span>
                Pagina {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                className="rounded-[5px] border border-wf-400 bg-white px-3 py-1.5 text-xs disabled:opacity-40"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Volgende
              </button>
            </div>
          </div>
        </>
      )}
    </SellerGate>
  )
}
