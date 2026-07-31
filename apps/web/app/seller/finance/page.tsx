"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { formatEuro } from "../../_components/storefront-shell"
import {
  FinanceApiError,
  formatFinanceDate,
  getSellerFinanceOverview,
  type SellerFinanceOverview,
} from "../../_lib/finance-api"

/**
 * finance-01 — Finance Dashboard (S3-08-05).
 */
export default function SellerFinanceDashboardPage() {
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
            : "Financiën laden mislukt."
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
        { label: "Finance Dashboard" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Financiën</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Overzicht van commissies, uitbetalingen en facturen.
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
          <div className="mt-5 grid gap-4 tablet:grid-cols-3">
            <div className="rounded-lg border border-wf-300 bg-white px-5 py-4">
              <div className="text-[26px] font-bold leading-none text-wf-900">
                {formatEuro(data.summary.net_revenue)}
              </div>
              <div className="mt-1.5 text-[11.5px] text-wf-600">
                Netto-omzet deze periode
              </div>
            </div>
            <div className="rounded-lg border border-wf-300 bg-white px-5 py-4">
              <div className="text-[26px] font-bold leading-none text-wf-900">
                {formatEuro(data.summary.commission_held)}
              </div>
              <div className="mt-1.5 text-[11.5px] text-wf-600">
                Ingehouden commissie (10%)
              </div>
            </div>
            <div className="rounded-lg border border-wf-300 bg-white px-5 py-4">
              <div className="text-[26px] font-bold leading-none text-wf-900">
                {formatEuro(data.summary.next_payout_amount)}
              </div>
              <div className="mt-1.5 text-[11.5px] text-wf-600">
                Eerstvolgende uitbetaling
              </div>
              {data.summary.next_payout_eligible_at ? (
                <p className="mt-1 text-[10.5px] text-wf-600">
                  Vanaf {formatFinanceDate(data.summary.next_payout_eligible_at)}
                </p>
              ) : null}
              <Link
                href="/seller/finance/uitbetalingen"
                className="mt-2 inline-block text-[11px] text-wf-700 underline"
              >
                ↳ Bekijk uitbetalingen
              </Link>
            </div>
          </div>

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-wf-500">
            Snelkoppelingen
          </h2>
          <div className="mt-2.5 overflow-hidden rounded-lg border border-wf-300 bg-white">
            <div className="flex items-center justify-between border-b border-wf-200 px-4 py-3 text-xs text-wf-700">
              <span>Commissie-overzicht bekijken</span>
              <Link
                href="/seller/finance/commissie"
                className="text-[11px] text-wf-800 underline"
              >
                Bekijken →
              </Link>
            </div>
            <div className="flex items-center justify-between border-b border-wf-200 px-4 py-3 text-xs text-wf-700">
              <span>Facturen downloaden</span>
              <Link
                href="/seller/finance/facturen"
                className="text-[11px] text-wf-800 underline"
              >
                Bekijken →
              </Link>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-xs text-wf-700">
              <span>BTW-overzicht (OSS) bekijken</span>
              <Link
                href="/seller/finance/btw"
                className="text-[11px] text-wf-800 underline"
              >
                Bekijken →
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </SellerGate>
  )
}
