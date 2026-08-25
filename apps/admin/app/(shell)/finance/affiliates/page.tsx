"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { FinanceNav } from "../../../../components/finance-nav"
import {
  FinanceAdminApiError,
  formatFinanceEuro,
  listFinanceAffiliates,
  type FinanceAffiliateRow,
  type FinancePeriodKey,
} from "../../../../lib/finance-admin-api"

const PAGE_SIZE = 25

export default function FinanceAffiliatesPage() {
  const [period, setPeriod] = useState<FinancePeriodKey>("last_30_days")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [rows, setRows] = useState<FinanceAffiliateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPage(0)
  }, [period, q])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listFinanceAffiliates({
      period,
      q: q.trim() || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        setRows(res.affiliates)
        setCount(res.count)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceAdminApiError
            ? err.message
            : "Affiliate-finance laden mislukt."
        )
        setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period, q, page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Affiliate finance</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Bestaande commissie- en payout-data. Attributieregels blijven ongewijzigd.
        Performance Center blijft onder Affiliate.
      </p>
      <div className="mt-4">
        <FinanceNav period={period} onPeriodChange={setPeriod} />
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Zoek affiliate"
        className="mb-4 h-9 min-w-[220px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
      />
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {loading ? (
        <p className="text-xs text-wf-600">Laden…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-wf-100 text-[11px] uppercase tracking-[0.04em] text-wf-500">
              <tr>
                <th className="px-3 py-2">Affiliate</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Omzet</th>
                <th className="px-3 py-2">Commissie</th>
                <th className="px-3 py-2">Openstaand</th>
                <th className="px-3 py-2">Payout periode</th>
                <th className="px-3 py-2">Betaald</th>
                <th className="px-3 py-2">Teruggedraaid</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-wf-500" colSpan={8}>
                    Geen affiliate-finance in deze periode.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.affiliate_id} className="border-t border-wf-200">
                    <td className="px-3 py-2">
                      <Link
                        href={`/finance/affiliates/${row.affiliate_id}?period=${period}`}
                        className="font-medium underline"
                      >
                        {row.affiliate_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {row.status ? <Badge>{row.status}</Badge> : "—"}
                    </td>
                    <td className="px-3 py-2">{formatFinanceEuro(row.revenue)}</td>
                    <td className="px-3 py-2">
                      {formatFinanceEuro(row.commission)}
                    </td>
                    <td className="px-3 py-2">
                      {formatFinanceEuro(row.commission_open)}
                    </td>
                    <td className="px-3 py-2">{formatFinanceEuro(row.payout)}</td>
                    <td className="px-3 py-2">
                      {formatFinanceEuro(row.payout_paid)}
                    </td>
                    <td className="px-3 py-2">
                      {formatFinanceEuro(row.payout_reversed)}
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
      <p className="mt-4 text-[11px] text-wf-500">
        Review en performance:{" "}
        <Link href="/affiliate" className="underline">
          Affiliate-module
        </Link>
      </p>
    </div>
  )
}
