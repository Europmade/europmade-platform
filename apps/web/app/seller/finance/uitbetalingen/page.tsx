"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  FinanceApiError,
  formatFinanceDate,
  getSellerFinanceOverview,
  payoutStatusLabel,
  type SellerFinanceOverview,
  type SellerFinancePayout,
} from "../../../_lib/finance-api"

/**
 * finance-03 — Uitbetalingen #50 (S3-08-05).
 */
export default function SellerFinanceUitbetalingenPage() {
  const [data, setData] = useState<SellerFinanceOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSellerFinanceOverview()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceApiError
            ? err.message
            : "Uitbetalingen laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  const payouts = data?.payouts ?? []
  const next = useMemo(() => {
    const planned = payouts
      .filter((p) => p.status === "Gepland")
      .slice()
      .sort(
        (a, b) =>
          new Date(a.eligible_at).getTime() - new Date(b.eligible_at).getTime()
      )
    return planned[0] ?? null
  }, [payouts])

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Financiën", href: "/seller/finance" },
        { label: "Uitbetalingen" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Uitbetalingen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Periodieke uitbetaling naar je geregistreerde IBAN.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {!data && !error ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : null}

      {data ? (
        <>
          <Notice className="mt-4">
            Uitbetaling vindt nooit plaats binnen de wettelijke retourtermijn
            (14 dagen) van de onderliggende order.
          </Notice>

          <div className="mt-5 grid gap-4 tablet:grid-cols-2">
            <div className="rounded-lg border border-wf-300 bg-white px-5 py-4">
              <div className="text-[26px] font-bold leading-none text-wf-900">
                {formatEuro(data.summary.next_payout_amount)}
              </div>
              <div className="mt-1.5 text-[11.5px] text-wf-600">
                Eerstvolgende uitbetaling
              </div>
            </div>
            <div className="rounded-lg border border-wf-300 bg-white px-5 py-4">
              <div className="text-[26px] font-bold leading-none text-wf-900">
                {next
                  ? formatFinanceDate(next.eligible_at)
                  : "—"}
              </div>
              <div className="mt-1.5 text-[11.5px] text-wf-600">
                Verwachte datum
              </div>
            </div>
          </div>

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-wf-500">
            Historie
          </h2>

          {payouts.length === 0 ? (
            <p className="mt-3 text-xs text-wf-600">Nog geen uitbetalingen.</p>
          ) : (
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-wf-400 text-[10px] uppercase tracking-wide text-wf-500">
                    <th className="px-3 py-2 font-semibold">Periode</th>
                    <th className="px-3 py-2 font-semibold">Bedrag</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p: SellerFinancePayout) => (
                    <tr
                      key={p.id}
                      className="border-b border-wf-200 text-wf-800"
                    >
                      <td className="px-3 py-2.5">
                        {p.order_number
                          ? `Order #${p.order_number}`
                          : p.period}
                      </td>
                      <td className="px-3 py-2.5">{formatEuro(p.amount)}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            p.status === "Voltooid" ? "solid" : "outline"
                          }
                        >
                          {payoutStatusLabel(p.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-wf-600">
                        {p.status === "Voltooid"
                          ? `Verwerkt ${formatFinanceDate(p.processed_at)}`
                          : `Eligible ${formatFinanceDate(p.eligible_at)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </SellerGate>
  )
}
