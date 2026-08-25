"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Notice } from "@europmade/ui"
import { FinanceNav } from "../../../../../components/finance-nav"
import {
  FinanceAdminApiError,
  formatFinanceEuro,
  getFinanceSettlement,
  type FinanceSettlement,
  type FinanceSellerInvoice,
} from "../../../../../lib/finance-admin-api"

export default function FinanceSettlementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [error, setError] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<FinanceSettlement | null>(null)
  const [invoice, setInvoice] = useState<FinanceSellerInvoice | null>(null)
  const [lines, setLines] = useState<
    Array<{
      id: string
      line_type: string
      description: string
      net_amount: number
      vat_amount: number
      gross_amount: number
    }>
  >([])

  useEffect(() => {
    getFinanceSettlement(id)
      .then((res) => {
        setSettlement(res.settlement)
        setInvoice(res.invoice)
        setLines(res.lines)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof FinanceAdminApiError
            ? err.message
            : "Settlement laden mislukt."
        )
      })
  }, [id])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Settlement</h1>
      <div className="mt-4">
        <FinanceNav />
      </div>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {!settlement ? (
        error ? null : (
          <p className="text-xs text-wf-600">Laden…</p>
        )
      ) : (
        <>
          <p className="mb-3 text-xs text-wf-600">
            {settlement.seller_name ?? settlement.seller_id} ·{" "}
            {new Date(settlement.period_start).toLocaleDateString("nl-NL")} –{" "}
            {new Date(settlement.period_end).toLocaleDateString("nl-NL")} ·{" "}
            <Badge variant="outline">{settlement.status}</Badge>
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs tablet:grid-cols-4">
            <Kpi label="Bruto verkoop" value={settlement.gross_sales} />
            <Kpi label="Retouren" value={settlement.refunds} />
            <Kpi label="Netto verkoop" value={settlement.net_sales} />
            <Kpi label="Platformcommissie" value={settlement.platform_commission} />
            <Kpi label="Advertising" value={settlement.advertising_amount} />
            <Kpi label="Banners (deel ads)" value={settlement.banner_amount} />
            <Kpi label="EuropMade-factuur" value={settlement.invoice_total} />
            <Kpi label="Netto settlement" value={settlement.net_settlement} />
          </div>
          <p className="mt-3 text-[11px] text-wf-500">
            Payout volgt later (G5). payout_id: {settlement.payout_id ?? "—"}
          </p>
          <section className="mt-5 rounded-lg border border-wf-300 bg-white p-4 text-xs">
            <h2 className="mb-2 font-semibold">Gekoppelde dienstenfactuur</h2>
            {invoice ? (
              <>
                <p>
                  {invoice.invoice_number} · {invoice.status} ·{" "}
                  {formatFinanceEuro(invoice.total)}
                </p>
                <p className="mt-1 text-wf-500">
                  PDF: fiscale layout wacht op belastingadviseur. Geen download.
                </p>
              </>
            ) : (
              <p className="text-wf-600">
                Geen dienstenfactuur (geen commissie-/advertisingregels in deze
                periode).
              </p>
            )}
          </section>
          {lines.length > 0 ? (
            <table className="mt-4 w-full border-collapse text-xs">
              <thead>
                <tr>
                  {["Type", "Omschrijving", "Netto", "BTW", "Bruto"].map((h) => (
                    <th
                      key={h}
                      className="border-b px-3 py-2 text-left text-[10px] uppercase text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-wf-200">
                    <td className="px-3 py-2">{l.line_type}</td>
                    <td className="px-3 py-2">{l.description}</td>
                    <td className="px-3 py-2">{formatFinanceEuro(l.net_amount)}</td>
                    <td className="px-3 py-2">{formatFinanceEuro(l.vat_amount)}</td>
                    <td className="px-3 py-2">
                      {formatFinanceEuro(l.gross_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <p className="mt-4 text-xs">
            <Link href="/finance/settlements" className="underline">
              Terug naar settlements
            </Link>
          </p>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-wf-300 bg-white px-3 py-2">
      <p className="text-[10px] uppercase text-wf-500">{label}</p>
      <p className="font-medium">{formatFinanceEuro(value)}</p>
    </div>
  )
}
