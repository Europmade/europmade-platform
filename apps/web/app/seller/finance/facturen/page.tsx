"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge, Notice } from "@europmade/ui"
import { cn } from "@europmade/utils"
import { SellerGate } from "../../_components/seller-gate"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  FinanceApiError,
  formatFinanceDate,
  getSellerFinanceOverview,
  type SellerFinanceInvoice,
} from "../../../_lib/finance-api"

type TabKey = "commissie" | "klant"

/**
 * finance-04 — Facturen (S3-08-05).
 */
export default function SellerFinanceFacturenPage() {
  const [invoices, setInvoices] = useState<SellerFinanceInvoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>("commissie")

  useEffect(() => {
    let cancelled = false
    getSellerFinanceOverview()
      .then((res) => {
        if (!cancelled) setInvoices(res.invoices)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceApiError
            ? err.message
            : "Facturen laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!invoices) return []
    if (tab === "commissie") {
      return invoices.filter(
        (inv) => inv.invoice_type === "Seller-commissiefactuur"
      )
    }
    return invoices.filter((inv) => inv.invoice_type === "Klant-factuur")
  }, [invoices, tab])

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Financiën", href: "/seller/finance" },
        { label: "Facturen" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Facturen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Commissiefacturen en klant-facturen/kwitanties per order.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {!invoices && !error ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : null}

      {invoices ? (
        <>
          <div className="mt-5 flex gap-0 border-b border-wf-300">
            <button
              type="button"
              onClick={() => setTab("commissie")}
              className={cn(
                "px-4 py-3 text-[12.5px] font-semibold text-wf-500",
                tab === "commissie" &&
                  "border-b-2 border-wf-900 text-wf-900"
              )}
            >
              Commissiefacturen
            </button>
            <button
              type="button"
              onClick={() => setTab("klant")}
              className={cn(
                "px-4 py-3 text-[12.5px] font-semibold text-wf-500",
                tab === "klant" && "border-b-2 border-wf-900 text-wf-900"
              )}
            >
              Klant-facturen
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-6 text-xs text-wf-600">
              Geen facturen in dit tabblad.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-wf-400 text-[10px] uppercase tracking-wide text-wf-500">
                    <th className="px-3 py-2 font-semibold">Factuurnummer</th>
                    <th className="px-3 py-2 font-semibold">Periode</th>
                    <th className="px-3 py-2 font-semibold">Bedrag</th>
                    <th className="px-3 py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-wf-200 text-wf-800"
                    >
                      <td className="px-3 py-2.5 font-medium">
                        <span className="font-mono text-[11px]">{inv.id}</span>
                        {inv.credit_of_invoice_id ? (
                          <Badge variant="outline" className="ml-2">
                            Creditnota
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        {inv.period ??
                          (inv.order_number
                            ? `Order #${inv.order_number}`
                            : formatFinanceDate(inv.issued_at))}
                      </td>
                      <td className="px-3 py-2.5">
                        {formatEuro(inv.total_amount)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {inv.pdf_url ? (
                          <a
                            href={inv.pdf_url}
                            className="text-[11px] font-semibold underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Downloaden
                          </a>
                        ) : (
                          <span
                            className="cursor-not-allowed text-[11px] text-wf-500"
                            title="PDF nog niet beschikbaar"
                          >
                            Downloaden
                          </span>
                        )}
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
