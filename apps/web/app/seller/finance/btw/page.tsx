"use client"

import { useEffect, useState } from "react"
import { Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  FinanceApiError,
  getSellerFinanceOverview,
  type SellerFinanceVatRow,
} from "../../../_lib/finance-api"

/**
 * finance-05 — BTW-overzicht OSS (S3-08-05).
 */
export default function SellerFinanceBtwPage() {
  const [rows, setRows] = useState<SellerFinanceVatRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSellerFinanceOverview()
      .then((res) => {
        if (!cancelled) setRows(res.vat_by_country)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceApiError
            ? err.message
            : "BTW-overzicht laden mislukt."
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
        { label: "BTW-overzicht" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        BTW-overzicht (OSS)
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        BTW-uitsplitsing per bestemmingsland, conform het One-Stop-Shop-model.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {!rows && !error ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : null}

      {rows ? (
        <>
          <Notice className="mt-4">
            Aggregatie van bevroren OSS-uitsplitsingen op klant-facturen
            (checkout-totalen). Geen client-side herberekening.
          </Notice>

          {rows.length === 0 ? (
            <p className="mt-6 text-xs text-wf-600">
              Nog geen BTW-gegevens beschikbaar.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-wf-400 text-[10px] uppercase tracking-wide text-wf-500">
                    <th className="px-3 py-2 font-semibold">Land</th>
                    <th className="px-3 py-2 font-semibold">Omzet excl. BTW</th>
                    <th className="px-3 py-2 font-semibold">BTW-tarief</th>
                    <th className="px-3 py-2 font-semibold">BTW-bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.country_code}-${row.vat_rate}`}
                      className="border-b border-wf-200 text-wf-800"
                    >
                      <td className="px-3 py-2.5">{row.country_label}</td>
                      <td className="px-3 py-2.5">
                        {formatEuro(row.amount_excl)}
                      </td>
                      <td className="px-3 py-2.5">
                        {Math.round(row.vat_rate * 100)}%
                      </td>
                      <td className="px-3 py-2.5">
                        {formatEuro(row.vat_amount)}
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
