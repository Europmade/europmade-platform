"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  OrderAdminApiError,
  listAdminReturns,
  type AdminReturnRow,
} from "../../../lib/order-admin-api"

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL")
}

const RETURN_STATUSES = [
  "Aangevraagd",
  "Bevestigd",
  "Onderweg",
  "Ontvangen",
  "Verwerkt",
  "Afgewezen",
  "Geëscaleerd",
]

/**
 * Retour Management Center — platformbreed.
 * Zelfde statusvocabulaire/enrichment als Seller Returns.
 */
export default function ReturnsOverviewPage() {
  const [rows, setRows] = useState<AdminReturnRow[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("open")
  const [q, setQ] = useState("")
  const [sellerId, setSellerId] = useState("")

  useEffect(() => {
    let cancelled = false
    setRows("loading")
    listAdminReturns({
      open: status === "open",
      status: status !== "open" && status ? status : undefined,
      q: q.trim() || undefined,
      seller_id: sellerId.trim() || undefined,
    })
      .then((res) => {
        if (!cancelled) setRows(res.returns)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderAdminApiError
            ? err.message
            : "Retouren laden mislukt."
        )
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [status, q, sellerId])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">
        Retour Management Center
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Alle platformretouren. Zelfde statussen en productinformatie als Seller
        Returns, platformbreed.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek retour, order, klant, seller, product…"
          className="h-9 min-w-[220px] flex-1 rounded-[5px] border border-wf-400 px-3 text-xs"
        />
        <input
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
          placeholder="Seller ID"
          className="h-9 w-[160px] rounded-[5px] border border-wf-400 px-3 text-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-[5px] border border-wf-400 px-2 text-xs"
        >
          <option value="open">In behandeling</option>
          <option value="">Alle statussen</option>
          {RETURN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {rows === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Geen retouren gevonden.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-wf-600">
                <th className="py-2 pr-3 font-semibold">Retour</th>
                <th className="py-2 pr-3 font-semibold">Order</th>
                <th className="py-2 pr-3 font-semibold">Datum</th>
                <th className="py-2 pr-3 font-semibold">Klant</th>
                <th className="py-2 pr-3 font-semibold">Seller</th>
                <th className="py-2 pr-3 font-semibold">Product</th>
                <th className="py-2 pr-3 font-semibold">Bedrag</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Refund</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-wf-200 text-wf-800">
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    {r.id.slice(0, 14)}…
                  </td>
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/orders/${r.order_id}`}
                      className="underline"
                    >
                      {r.order_number}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">{formatDate(r.created_at)}</td>
                  <td className="py-2.5 pr-3">
                    {r.customer_name || r.customer_email || r.customer_id}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/partners/${r.seller_id}`}
                      className="underline"
                    >
                      {r.seller_name || r.seller_id}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">{r.product_name}</td>
                  <td className="py-2.5 pr-3">
                    {r.amount != null ? formatEuro(r.amount) : "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline">{r.status}</Badge>
                  </td>
                  <td className="py-2.5 pr-3">{r.refund_status || "—"}</td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/returns/${r.id}`}
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
