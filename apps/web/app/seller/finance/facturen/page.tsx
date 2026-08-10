"use client"

import { useState } from "react"
import { Badge, Button, FileUpload, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_ORDERS } from "../../_lib/demo-data"
import { useDemoSellerInvoices } from "../../_lib/demo-store"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

/**
 * Facturen — verkoper uploadt/koppelt eigen klantfacturen (EuropMade genereert ze niet).
 */
export default function SellerFinanceFacturenPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [invoices, setInvoices] = useDemoSellerInvoices()
  const [orderNumber, setOrderNumber] = useState(
    DEMO_ORDERS[0]?.order_number ?? ""
  )
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function uploadInvoice() {
    if (!file || !orderNumber) {
      setNote(t("sellerFinanceInvoiceNeedOrderFile", locale))
      return
    }
    const order = DEMO_ORDERS.find((o) => o.order_number === orderNumber)
    setInvoices((prev) => [
      {
        id: `sinv_${Date.now()}`,
        order_number: orderNumber,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
        amount: order?.total ?? 0,
        status: "Gekoppeld",
      },
      ...prev,
    ])
    setFile(null)
    setNote(t("sellerFinanceInvoiceLinked", locale))
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        { label: t("sellerInvoices", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerInvoices", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerFinanceInvoicesIntro", locale)}
      </p>

      {note ? (
        <Notice variant="info" className="mt-4">
          {note}
        </Notice>
      ) : null}

      <section className="mt-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerFinanceInvoicesUpload", locale)}
        </h2>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
              {t("commonOrder", locale)}
            </label>
            <select
              className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            >
              {DEMO_ORDERS.map((o) => (
                <option key={o.id} value={o.order_number}>
                  {o.order_number} — {o.customer_name}
                </option>
              ))}
            </select>
          </div>
          <FileUpload
            label={t("sellerFinanceInvoiceFile", locale)}
            requirementLabel={t("sellerFinanceInvoiceRequirement", locale)}
            accept="application/pdf,.pdf"
            value={file}
            onChange={setFile}
          />
        </div>
        <div className="mt-4">
          <Button type="button" onClick={uploadInvoice}>
            {t("sellerFinanceInvoiceLink", locale)}
          </Button>
        </div>
      </section>

      {invoices.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("sellerFinanceInvoicesEmptyTitle", locale)}
            description={t("sellerFinanceInvoicesEmptyDesc", locale)}
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonOrder", locale),
                  t("commonFile", locale),
                  t("commonAmount", locale),
                  t("sellerFinanceUploadedAt", locale),
                  t("commonStatus", locale),
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
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">{inv.order_number}</td>
                  <td className="px-4 py-2.5">{inv.file_name}</td>
                  <td className="px-4 py-2.5">{formatEuro(inv.amount)}</td>
                  <td className="px-4 py-2.5">
                    {new Date(inv.uploaded_at).toLocaleDateString(intl)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">
                      {statusLabel(inv.status, locale)}
                    </Badge>
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
