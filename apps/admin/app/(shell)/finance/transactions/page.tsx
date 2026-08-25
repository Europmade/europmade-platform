"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { FinanceNav } from "../../../../components/finance-nav"
import {
  FINANCE_TXN_TYPE_LABELS,
  FinanceAdminApiError,
  formatFinanceDate,
  formatFinanceEuro,
  listFinanceTransactions,
  type FinancePeriodKey,
  type FinanceTransaction,
  type FinanceTxnType,
} from "../../../../lib/finance-admin-api"

const TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "Alle types" },
  { value: "platform_commission", label: "Platformcommissie" },
  { value: "affiliate_commission", label: "Affiliatecommissie" },
  { value: "seller_payout", label: "Seller-uitbetaling" },
  { value: "affiliate_payout", label: "Affiliate-uitbetaling" },
  { value: "refund", label: "Terugbetaling" },
]

const PAGE_SIZE = 25

export default function FinanceTransactionsPage() {
  const [period, setPeriod] = useState<FinancePeriodKey>("last_30_days")
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [rows, setRows] = useState<FinanceTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodLabel, setPeriodLabel] = useState("")

  useEffect(() => {
    setPage(0)
  }, [period, q, type, status])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listFinanceTransactions({
      period,
      q: q.trim() || undefined,
      type: type || undefined,
      status: status || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        setRows(res.transactions)
        setCount(res.count)
        setPeriodLabel(res.period.label)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceAdminApiError
            ? err.message
            : "Transacties laden mislukt."
        )
        setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period, q, type, status, page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Transacties</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Commissie, payouts en creditnota&apos;s uit de bestaande finance-module.
        Type &quot;Order&quot; bestaat niet als aparte ledgerregel — orders staan
        als referentie op de rijen.
      </p>
      <div className="mt-4">
        <FinanceNav period={period} onPeriodChange={setPeriod} />
      </div>
      <p className="mb-3 text-[11px] text-wf-500">Periode: {periodLabel || period}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek order, partij, referentie"
          className="h-9 min-w-[220px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
        >
          <option value="">Alle statussen</option>
          <option value="Toegekend">Toegekend</option>
          <option value="Teruggedraaid">Teruggedraaid</option>
          <option value="Gepland">Gepland</option>
          <option value="In behandeling">In behandeling</option>
          <option value="Voltooid">Voltooid</option>
          <option value="Geannuleerd">Geannuleerd</option>
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
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Partij</th>
                <th className="px-3 py-2">Bedrag</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Commissie</th>
                <th className="px-3 py-2">Payout</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-wf-500" colSpan={8}>
                    Geen transacties in deze periode.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="border-t border-wf-200">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatFinanceDate(row.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      {row.order_id ? (
                        <Link
                          href={`/orders/${row.order_id}`}
                          className="underline"
                        >
                          {row.order_number || row.order_id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {FINANCE_TXN_TYPE_LABELS[row.type as FinanceTxnType] ??
                        row.type}
                    </td>
                    <td className="px-3 py-2">{row.party_name || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatFinanceEuro(row.amount)} {row.currency}
                    </td>
                    <td className="px-3 py-2">
                      <Badge>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.commission_amount != null
                        ? formatFinanceEuro(row.commission_amount)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/finance/transactions/${encodeURIComponent(row.id)}`}
                        className="underline"
                      >
                        {row.payout_status || "Detail"}
                      </Link>
                    </td>
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
            className="underline disabled:no-underline disabled:text-wf-400"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Vorige
          </button>
          <span>
            {page + 1} / {totalPages} ({count})
          </span>
          <button
            type="button"
            className="underline disabled:no-underline disabled:text-wf-400"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Volgende
          </button>
        </div>
      ) : null}
    </div>
  )
}
