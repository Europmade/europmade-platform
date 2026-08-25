"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { FinanceNav } from "../../../../components/finance-nav"
import {
  FinanceAdminApiError,
  formatFinanceDate,
  formatFinanceEuro,
  listFinancePayouts,
  type FinancePayout,
  type FinancePeriodKey,
} from "../../../../lib/finance-admin-api"

const PAGE_SIZE = 25

export default function FinancePayoutsPage() {
  const [period, setPeriod] = useState<FinancePeriodKey>("all_time")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [recipientType, setRecipientType] = useState("")
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [rows, setRows] = useState<FinancePayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPage(0)
  }, [period, q, status, recipientType])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listFinancePayouts({
      period,
      q: q.trim() || undefined,
      status: status || undefined,
      recipient_type: recipientType || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        setRows(res.payouts)
        setCount(res.count)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceAdminApiError
            ? err.message
            : "Payouts laden mislukt."
        )
        setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period, q, status, recipientType, page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Uitbetalingen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Bestaand payout-ledger. Statussen: Gepland, In behandeling, Voltooid,
        Geannuleerd. Verwerken via Stripe Connect is nog een stub — geen
        verwerkingsknop in deze UI.
      </p>
      <div className="mt-4">
        <FinanceNav period={period} onPeriodChange={setPeriod} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek order / referentie"
          className="h-9 min-w-[220px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        >
          <option value="">Alle statussen</option>
          <option value="Gepland">Gepland</option>
          <option value="In behandeling">In behandeling</option>
          <option value="Voltooid">Voltooid</option>
          <option value="Geannuleerd">Geannuleerd</option>
        </select>
        <select
          value={recipientType}
          onChange={(e) => setRecipientType(e.target.value)}
          className="h-9 rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        >
          <option value="">Alle ontvangers</option>
          <option value="Seller">Seller</option>
          <option value="Affiliate">Affiliate</option>
        </select>
      </div>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {loading ? (
        <p className="text-xs text-wf-600">Laden…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-wf-100 text-[11px] uppercase tracking-[0.04em] text-wf-500">
              <tr>
                <th className="px-3 py-2">Ontvanger</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Bedrag</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">eligible_at</th>
                <th className="px-3 py-2">processed_at</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Transfer</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-wf-500" colSpan={8}>
                    Geen payouts.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className="border-t border-wf-200">
                    <td className="px-3 py-2">
                      <Link href={`/finance/payouts/${p.id}`} className="underline">
                        {p.seller_name || p.affiliate_name || p.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.recipient_type}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatFinanceEuro(p.amount)} {p.currency}
                    </td>
                    <td className="px-3 py-2">
                      <Badge>{p.status}</Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatFinanceDate(p.eligible_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatFinanceDate(p.processed_at)}
                    </td>
                    <td className="px-3 py-2">
                      {p.order_id ? (
                        <Link href={`/orders/${p.order_id}`} className="underline">
                          {p.order_number || p.order_id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">{p.stripe_transfer_id || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {count > PAGE_SIZE ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-wf-600">
          <button
            type="button"
            disabled={page <= 0}
            className="underline disabled:text-wf-400"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Vorige
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            className="underline disabled:text-wf-400"
            onClick={() => setPage((p) => p + 1)}
          >
            Volgende
          </button>
        </div>
      ) : null}
    </div>
  )
}
