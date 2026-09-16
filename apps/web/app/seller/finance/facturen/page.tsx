"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"
import { medusaBackendUrl } from "../../../_lib/medusa-backend-url"

type SellerInvoice = {
  id: string
  invoice_number: string
  invoice_date: string
  period_start: string
  period_end: string
  subtotal: number
  vat_amount: number
  total: number
  status: string
  pdf_url: string | null
}

export default function SellerFinanceFacturenPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [invoices, setInvoices] = useState<SellerInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
    fetch(`${medusaBackendUrl()}/store/finance/seller/invoices`, {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(PK ? { "x-publishable-api-key": PK } : {}),
      },
    })
      .then((r) => (r.ok ? r.json() : { invoices: [] }))
      .then((d) => {
        setInvoices(d.invoices ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        { label: t("sellerFinanceEuropmadeInvoices", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerFinanceEuropmadeInvoices", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerFinanceEuropmadeInvoicesDesc", locale)}
      </p>

      {!loading && invoices.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("sellerFinanceEuropmadeInvoicesEmpty", locale)}
            description=""
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("sellerFinanceInvoiceNumber", locale),
                  t("sellerFinanceInvoiceDate", locale),
                  t("sellerFinancePeriod", locale),
                  t("sellerFinanceExclVat", locale),
                  t("sellerFinanceVat", locale),
                  t("sellerFinanceTotal", locale),
                  t("commonStatus", locale),
                  "",
                ].map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5 font-medium text-wf-800">
                    <Link
                      href={`/seller/finance/facturen/${inv.id}`}
                      className="underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-wf-700">
                    {new Date(inv.invoice_date).toLocaleDateString(intl)}
                  </td>
                  <td className="px-4 py-2.5 text-wf-700">
                    {new Date(inv.period_start).toLocaleDateString(intl)} –{" "}
                    {new Date(inv.period_end).toLocaleDateString(intl)}
                  </td>
                  <td className="px-4 py-2.5 text-wf-700">
                    {formatEuro(inv.subtotal)}
                  </td>
                  <td className="px-4 py-2.5 text-wf-700">
                    {formatEuro(inv.vat_amount)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-wf-800">
                    {formatEuro(inv.total)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">
                      {statusLabel(inv.status, locale)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 space-x-2">
                    <Link
                      href={`/seller/finance/facturen/${inv.id}`}
                      className="text-[11px] text-wf-800 underline"
                    >
                      {t("sellerFinanceDownloadInvoicePdf", locale)}
                    </Link>
                    <Link
                      href={`/seller/finance/facturen/${inv.id}`}
                      className="text-[11px] text-wf-800 underline"
                    >
                      {t("sellerFinanceDownloadSpec", locale)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
