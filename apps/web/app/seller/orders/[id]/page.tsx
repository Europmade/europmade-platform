"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { getOrderDetail } from "../../_lib/demo-data-details"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

export default function SellerOrderDetailPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const params = useParams<{ id: string }>()
  const order = useMemo(() => getOrderDetail(params.id), [params.id])
  const [note, setNote] = useState<string | null>(null)

  if (!order) {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavOrders", locale), href: "/seller/orders" },
          { label: t("commonUnknown", locale) },
        ]}
      >
        <EmptyState
          title={t("sellerOrderNotFoundTitle", locale)}
          description={t("sellerOrderNotFoundDesc", locale)}
          primaryAction={{
            label: t("sellerOrderBackToOrders", locale),
            href: "/seller/orders",
          }}
        />
      </SellerGate>
    )
  }

  function download(labelKey: "sellerOrderInvoiceLabel" | "sellerOrderPackingLabel") {
    setNote(
      tFormat("sellerOrderDownloaded", locale, {
        label: t(labelKey, locale),
      })
    )
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavOrders", locale), href: "/seller/orders" },
        { label: order.order_number },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {tFormat("sellerOrderTitle", locale, {
              number: order.order_number,
            })}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {new Date(order.created_at).toLocaleString(intl)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => download("sellerOrderInvoiceLabel")}
          >
            {t("sellerOrderDownloadInvoice", locale)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => download("sellerOrderPackingLabel")}
          >
            {t("sellerOrderDownloadPacking", locale)}
          </Button>
        </div>
      </div>

      {note ? (
        <Notice variant="info" className="mb-4">
          {note}
        </Notice>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("commonOrder", locale)}
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">{t("sellerReturnsOrderNumber", locale)}</dt>
              <dd>{order.order_number}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">{t("sellerOrderDate", locale)}</dt>
              <dd>{new Date(order.created_at).toLocaleDateString(intl)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">{t("commonStatus", locale)}</dt>
              <dd>
                <Badge variant="outline">
                  {statusLabel(order.status, locale)}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">
                {t("sellerOrderPaymentStatus", locale)}
              </dt>
              <dd>
                <Badge variant="outline">
                  {statusLabel(order.payment_status, locale)}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">
                {t("sellerOrderShippingStatus", locale)}
              </dt>
              <dd>
                <Badge variant="outline">
                  {statusLabel(order.shipping_status, locale)}
                </Badge>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("commonCustomer", locale)}
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div>
              <dt className="text-[10.5px] uppercase text-wf-500">
                {t("commonName", locale)}
              </dt>
              <dd>{order.customer.name}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase text-wf-500">
                {t("commonEmail", locale)}
              </dt>
              <dd>{order.customer.email}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase text-wf-500">
                {t("commonPhone", locale)}
              </dt>
              <dd>{order.customer.phone}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerOrderBillingAddress", locale)}
          </h2>
          <p className="whitespace-pre-line text-xs text-wf-800">
            {order.billing_address}
          </p>
        </section>
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerSettingsShippingAddress", locale)}
          </h2>
          <p className="whitespace-pre-line text-xs text-wf-800">
            {order.shipping_address}
          </p>
        </section>
      </div>

      <section className="mb-5 overflow-hidden rounded-lg border border-wf-300 bg-white">
        <h2 className="border-b border-wf-300 px-5 py-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerNavProducts", locale)}
        </h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {[
                "",
                t("commonProduct", locale),
                t("commonSku", locale),
                t("commonQuantity", locale),
                t("commonPrice", locale),
                t("commonTotal", locale),
              ].map((h) => (
                <th
                  key={h || "img"}
                  className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.sku} className="border-b border-wf-200 last:border-b-0">
                <td className="px-4 py-2.5">
                  <span
                    className="inline-block h-10 w-10 rounded-sm"
                    style={{ backgroundColor: line.image_color }}
                    aria-hidden
                  />
                </td>
                <td className="px-4 py-2.5 text-wf-800">{line.product_name}</td>
                <td className="px-4 py-2.5 text-wf-600">{line.sku}</td>
                <td className="px-4 py-2.5">{line.quantity}</td>
                <td className="px-4 py-2.5">{formatEuro(line.unit_price)}</td>
                <td className="px-4 py-2.5">
                  {formatEuro(line.unit_price * line.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerOrderFinancial", locale)}
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div className="flex justify-between">
              <dt>{t("sellerOrderSubtotal", locale)}</dt>
              <dd>{formatEuro(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("sellerOrderShippingCost", locale)}</dt>
              <dd>{formatEuro(order.shipping_cost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("sellerFinanceVatLabel", locale)}</dt>
              <dd>{formatEuro(order.vat)}</dd>
            </div>
            <div className="flex justify-between border-t border-wf-200 pt-2 font-semibold">
              <dt>{t("sellerOrderGrandTotal", locale)}</dt>
              <dd>{formatEuro(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerOrderShipping", locale)}
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("sellerOrderCarrier", locale)}</dt>
              <dd>{order.carrier}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("sellerOrderTracking", locale)}</dt>
              <dd>
                {order.tracking_code ?? t("commonNotAvailableYet", locale)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 space-y-2 text-xs">
            <div>
              <span className="text-wf-500">
                {t("sellerOrderMessages", locale)}{" "}
              </span>
              {order.message_ids.length === 0 ? (
                t("commonNone", locale)
              ) : (
                order.message_ids.map((id) => (
                  <Link
                    key={id}
                    href={`/seller/messages/${id}`}
                    className="mr-2 font-semibold underline"
                  >
                    {id}
                  </Link>
                ))
              )}
            </div>
            <div>
              <span className="text-wf-500">
                {t("sellerOrderReturns", locale)}{" "}
              </span>
              {order.return_ids.length === 0 ? (
                t("commonNone", locale)
              ) : (
                order.return_ids.map((id) => (
                  <Link
                    key={id}
                    href={`/seller/returns/${id}`}
                    className="mr-2 font-semibold underline"
                  >
                    {id}
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </SellerGate>
  )
}
