"use client"

import { useEffect, useState } from "react"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  FinanceApiError,
  formatFinanceDate,
  getSellerFinanceOverview,
  type SellerFinanceCommission,
} from "../../../_lib/finance-api"

/**
 * finance-02 — Commissie-overzicht (S3-08-05).
 */
export default function SellerFinanceCommissiePage() {
  const [rows, setRows] = useState<SellerFinanceCommission[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSellerFinanceOverview()
      .then((res) => {
        if (!cancelled) setRows(res.commissions)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceApiError
            ? err.message
            : "Commissie laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Financiën", href: "/seller/finance" },
        { label: "Commissie" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Commissie-overzicht</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Platformcommissie (vast 10%) per order, server-side berekend.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {!rows && !error ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : null}

      {rows && rows.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Nog geen commissieregels.</p>
      ) : null}

      {rows && rows.length > 0 ? (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-wf-400 text-[10px] uppercase tracking-wide text-wf-500">
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Datum</th>
                  <th className="px-3 py-2 font-semibold">Ordersubtotaal</th>
                  <th className="px-3 py-2 font-semibold">Commissie (10%)</th>
                  <th className="px-3 py-2 font-semibold">Netto</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-wf-200 text-wf-800">
                    <td className="px-3 py-2.5 font-medium">
                      #{row.order_number}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatFinanceDate(row.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatEuro(row.order_subtotal)}
                    </td>
                    <td className="px-3 py-2.5">{formatEuro(row.amount)}</td>
                    <td className="px-3 py-2.5">{formatEuro(row.netto)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-wf-500">
            {rows.length} commissieregel{rows.length === 1 ? "" : "s"}
          </p>
        </>
      ) : null}
    </SellerGate>
  )
}
