"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../../../_components/seller-gate"
import { formatEuro } from "../../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../../_lib/i18n/locales"
import { t } from "../../../../_lib/i18n/messages"
import { statusLabel } from "../../../../_lib/i18n/status-labels"
import { medusaBackendUrl } from "../../../../_lib/medusa-backend-url"

type InvoiceLine = {
  id: string
  line_type: string
  description: string
  source_ref: string | null
  quantity: number
  unit_price: number
  commission_pct: number | null
  net_amount: number
  vat_rate: number
  vat_amount: number
  gross_amount: number
}

export default function SellerInvoiceDetailPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const params = useParams()
  const invoiceId = params?.id as string
  const [invoice, setInvoice] = useState<any>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!invoiceId) return
    const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
    fetch(
      `${medusaBackendUrl()}/store/finance/seller/invoices/${invoiceId}`,
      {
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(PK ? { "x-publishable-api-key": PK } : {}),
        },
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setInvoice(d.invoice)
          setLines(d.lines ?? [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [invoiceId])

  if (loading) {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavFinance", locale), href: "/seller/finance" },
          { label: "..." },
        ]}
      >
        <p className="text-xs text-wf-500">Loading...</p>
      </SellerGate>
    )
  }

  if (!invoice) {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavFinance", locale), href: "/seller/finance" },
          { label: t("sellerFinanceInvoiceDetail", locale) },
        ]}
      >
        <Notice variant="warning">Invoice not found.</Notice>
      </SellerGate>
    )
  }

  const commissionLines = lines.filter((l) => l.line_type === "commission")
  const advertisingLines = lines.filter((l) => l.line_type === "advertising")
  const creditLines = lines.filter(
    (l) => l.line_type === "credit" || l.line_type === "debit"
  )

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        {
          label: t("sellerFinanceEuropmadeInvoices", locale),
          href: "/seller/finance/facturen",
        },
        { label: invoice.invoice_number },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerFinanceInvoiceDetail", locale)}: {invoice.invoice_number}
      </h1>

      {/* Invoice info */}
      <section className="mt-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerFinanceInvoiceInfo", locale)}
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs tablet:grid-cols-4">
          <div>
            <span className="text-wf-500">
              {t("sellerFinanceInvoiceNumber", locale)}
            </span>
            <p className="font-medium text-wf-800">
              {invoice.invoice_number}
            </p>
          </div>
          <div>
            <span className="text-wf-500">
              {t("sellerFinanceInvoiceDate", locale)}
            </span>
            <p className="font-medium text-wf-800">
              {new Date(invoice.invoice_date).toLocaleDateString(intl)}
            </p>
          </div>
          <div>
            <span className="text-wf-500">
              {t("sellerFinancePeriod", locale)}
            </span>
            <p className="font-medium text-wf-800">
              {new Date(invoice.period_start).toLocaleDateString(intl)} –{" "}
              {new Date(invoice.period_end).toLocaleDateString(intl)}
            </p>
          </div>
          <div>
            <span className="text-wf-500">
              {t("commonStatus", locale)}
            </span>
            <p>
              <Badge variant="outline">
                {statusLabel(invoice.status, locale)}
              </Badge>
            </p>
          </div>
          <div>
            <span className="text-wf-500">
              {t("sellerFinanceDueDate", locale)}
            </span>
            <p className="font-medium text-wf-800">
              {new Date(invoice.due_date).toLocaleDateString(intl)}
            </p>
          </div>
          <div>
            <span className="text-wf-500">
              {t("sellerFinanceVatRegime", locale)}
            </span>
            <p className="font-medium text-wf-800">{invoice.vat_regime}</p>
          </div>
        </div>
      </section>

      {/* Amounts */}
      <section className="mt-4 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerFinanceAmounts", locale)}
        </h2>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-wf-500">
              {t("sellerFinanceExclVat", locale)}
            </span>
            <p className="text-lg font-medium text-wf-800">
              {formatEuro(invoice.subtotal)}
            </p>
          </div>
          <div>
            <span className="text-wf-500">
              {t("sellerFinanceVat", locale)}
            </span>
            <p className="text-lg font-medium text-wf-800">
              {formatEuro(invoice.vat_amount)}
            </p>
          </div>
          <div>
            <span className="text-wf-500">
              {t("sellerFinanceTotal", locale)}
            </span>
            <p className="text-lg font-bold text-wf-900">
              {formatEuro(invoice.total)}
            </p>
          </div>
        </div>
      </section>

      {/* Specification - Commission lines */}
      {commissionLines.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerFinanceCommissionLines", locale)}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("commonOrder", locale),
                    t("sellerFinanceSalesValue", locale),
                    t("sellerFinanceCommissionPct", locale),
                    t("sellerFinanceCommissionAmount", locale),
                    t("sellerFinanceVat", locale),
                    t("sellerFinanceTotal", locale),
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissionLines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-wf-200 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-wf-800">
                      {l.description}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(l.unit_price)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {l.commission_pct != null
                        ? `${(l.commission_pct * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(l.net_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(l.vat_amount)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-wf-800">
                      {formatEuro(l.gross_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Advertising lines */}
      {advertisingLines.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerFinanceAdvertisingLines", locale)}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("sellerFinanceProduct", locale),
                    t("sellerFinanceQuantity", locale),
                    t("sellerFinanceExclVat", locale),
                    t("sellerFinanceVat", locale),
                    t("sellerFinanceTotal", locale),
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {advertisingLines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-wf-200 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-wf-800">
                      {l.description}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {l.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(l.net_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-700">
                      {formatEuro(l.vat_amount)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-wf-800">
                      {formatEuro(l.gross_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Credit / correction lines */}
      {creditLines.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerFinanceCreditLines", locale)}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("sellerFinanceProduct", locale),
                    t("sellerFinanceExclVat", locale),
                    t("sellerFinanceVat", locale),
                    t("sellerFinanceTotal", locale),
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creditLines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-wf-200 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-wf-800">
                      {l.description}
                    </td>
                    <td className="px-4 py-2.5 text-red-600">
                      {formatEuro(l.net_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-red-600">
                      {formatEuro(l.vat_amount)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-red-600">
                      {formatEuro(l.gross_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Downloads */}
      <section className="mt-5 flex gap-3">
        {invoice.pdf_url && (
          <a
            href={invoice.pdf_url}
            className="rounded bg-wf-900 px-4 py-2 text-[11px] font-medium text-white"
          >
            {t("sellerFinanceDownloadInvoicePdf", locale)}
          </a>
        )}
        <button
          type="button"
          className="rounded border border-wf-400 bg-white px-4 py-2 text-[11px] font-medium text-wf-800"
          onClick={async () => {
            const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
            const res = await fetch(
              `${medusaBackendUrl()}/store/finance/seller/sales?format=csv`,
              {
                credentials: "include",
                headers: {
                  ...(PK ? { "x-publishable-api-key": PK } : {}),
                },
              }
            )
            if (!res.ok) return
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "specification.csv"
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          {t("sellerFinanceDownloadSpec", locale)}
        </button>
      </section>
    </SellerGate>
  )
}
