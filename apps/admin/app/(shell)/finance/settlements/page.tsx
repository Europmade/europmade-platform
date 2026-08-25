"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { FinanceNav } from "../../../../components/finance-nav"
import {
  FinanceAdminApiError,
  closeFinancePeriod,
  formatFinanceEuro,
  listFinanceSettlements,
  type FinanceSettlement,
} from "../../../../lib/finance-admin-api"

export default function FinanceSettlementsPage() {
  const [rows, setRows] = useState<FinanceSettlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth() + 1)

  function reload() {
    setLoading(true)
    listFinanceSettlements()
      .then((res) => {
        setRows(res.settlements)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof FinanceAdminApiError
            ? err.message
            : "Settlements laden mislukt."
        )
        setRows([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Settlements</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Periodieke afsluiting per seller: verkopen, retouren, EuropMade-dienstenfactuur
        en netto bedrag voor een latere payout. Geen uitbetaling vanuit dit scherm.
        BTW-regimes volgen bestaande configuratie (nog open bij de belastingadviseur).
      </p>
      <div className="mt-4">
        <FinanceNav />
      </div>
      <form
        className="mb-4 flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          setClosing(true)
          try {
            await closeFinancePeriod({ year, month })
            reload()
          } catch (err: unknown) {
            setError(
              err instanceof FinanceAdminApiError
                ? err.message
                : "Afsluiten mislukt."
            )
          } finally {
            setClosing(false)
          }
        }}
      >
        <label className="text-[11px] text-wf-600">
          Jaar
          <input
            type="number"
            className="ml-1 h-9 w-20 rounded border border-wf-400 px-2 text-xs"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <label className="text-[11px] text-wf-600">
          Maand
          <input
            type="number"
            min={1}
            max={12}
            className="ml-1 h-9 w-16 rounded border border-wf-400 px-2 text-xs"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </label>
        <button
          type="submit"
          disabled={closing}
          className="h-9 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {closing ? "Afsluiten…" : "Periode afsluiten (alle sellers)"}
        </button>
      </form>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {loading ? (
        <p className="text-xs text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-wf-600">Nog geen afgesloten settlements.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  "Seller",
                  "Periode",
                  "Status",
                  "Netto verkoop",
                  "Factuur",
                  "Netto settlement",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="border-b border-wf-400 px-3 py-2 text-left text-[10px] uppercase text-wf-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-wf-200">
                  <td className="px-3 py-2">{row.seller_name ?? row.seller_id}</td>
                  <td className="px-3 py-2">
                    {new Date(row.period_start).toLocaleDateString("nl-NL")} –{" "}
                    {new Date(row.period_end).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{row.status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {formatFinanceEuro(row.net_sales)}
                  </td>
                  <td className="px-3 py-2">
                    {formatFinanceEuro(row.invoice_total)}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {formatFinanceEuro(row.net_settlement)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      className="underline"
                      href={`/finance/settlements/${row.id}`}
                    >
                      Detail
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
