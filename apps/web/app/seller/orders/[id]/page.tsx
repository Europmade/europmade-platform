"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  OrderServiceApiError,
  createSellerReturn,
  ensureSellerOrderMessage,
  generateSellerPackingSlip,
  getSellerOrder,
  uploadSellerOrderDocument,
  upsertSellerShipment,
  type OrderAddressView,
  type SellerOrderBundle,
} from "../../../_lib/order-service-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

const DOC_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf"

function shippingStatusLabel(status: string, locale: Parameters<typeof t>[1]) {
  if (status === "pending") return t("sellerShipStatusPending", locale)
  if (status === "shipped") return t("sellerShipStatusShipped", locale)
  if (status === "in_transit") return t("sellerShipStatusInTransit", locale)
  if (status === "out_for_delivery")
    return t("sellerShipStatusOutForDelivery", locale)
  if (status === "delivered") return t("sellerShipStatusDelivered", locale)
  if (status === "exception") return t("sellerShipStatusException", locale)
  return statusLabel(status, locale)
}

function returnStatusLabel(status: string, locale: Parameters<typeof t>[1]) {
  if (status === "Aangevraagd") return t("sellerReturnStatusRequested", locale)
  if (status === "Bevestigd") return t("sellerReturnStatusConfirmed", locale)
  if (status === "Onderweg") return t("sellerReturnStatusInTransit", locale)
  if (status === "Ontvangen") return t("sellerReturnStatusReceived", locale)
  if (status === "Verwerkt") return t("sellerReturnStatusRefunded", locale)
  return statusLabel(status, locale)
}

function unitPrice(value: unknown) {
  return Number(value) || 0
}

function CompactRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(7.5rem,9rem)_1fr] items-baseline gap-x-3 gap-y-0.5 text-xs">
      <dt className="text-wf-500">{label}</dt>
      <dd className="min-w-0 font-medium text-wf-900">{children}</dd>
    </div>
  )
}

function AddressBlock({
  title,
  address,
  fallbackName,
  locale,
}: {
  title: string
  address?: OrderAddressView | null
  fallbackName?: string | null
  locale: Parameters<typeof t>[1]
}) {
  const name = address?.name || fallbackName || "—"
  const street = address?.street || "—"
  const postal = address?.postal_code || "—"
  const city = address?.city || "—"
  const country =
    address?.country || address?.country_code || "—"
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-wf-500">
        {title}
      </p>
      <dl className="space-y-1">
        <CompactRow label={t("commonName", locale)}>{name}</CompactRow>
        <CompactRow label={t("sellerOrderStreet", locale)}>{street}</CompactRow>
        <CompactRow label={t("sellerOrderPostalCode", locale)}>
          {postal}
        </CompactRow>
        <CompactRow label={t("sellerOrderCity", locale)}>{city}</CompactRow>
        <CompactRow label={t("sellerOrderCountry", locale)}>
          {country}
          {address?.country_code ? ` (${address.country_code})` : null}
        </CompactRow>
      </dl>
    </div>
  )
}

export default function SellerOrderDetailPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const orderId = params.id

  const [bundle, setBundle] = useState<SellerOrderBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [carrier, setCarrier] = useState("")
  const [trackingCode, setTrackingCode] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [shipmentStatus, setShipmentStatus] = useState("pending")

  const [messageBody, setMessageBody] = useState("")
  const [returnLineId, setReturnLineId] = useState("")
  const [returnReason, setReturnReason] = useState("")

  const applyBundle = useCallback((next: SellerOrderBundle) => {
    setBundle(next)
    setCarrier(next.order.carrier ?? "")
    setTrackingCode(next.order.tracking_code ?? "")
    setTrackingUrl(next.order.tracking_url ?? "")
    setShipmentStatus(next.order.shipping_status || "pending")
  }, [])

  const load = useCallback(() => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    getSellerOrder(orderId)
      .then((res) => applyBundle(res))
      .catch((err: unknown) => {
        setBundle(null)
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("sellerOrderNotFoundDesc", locale)
        )
      })
      .finally(() => setLoading(false))
  }, [orderId, locale, applyBundle])

  useEffect(() => {
    load()
  }, [load])

  async function saveShipment(extra?: {
    status?: string
    delivered_at?: string | null
    shipped_at?: string | null
  }) {
    if (!orderId) return
    setBusy(true)
    setError(null)
    try {
      const next = await upsertSellerShipment(orderId, {
        carrier: carrier.trim() || null,
        tracking_code: trackingCode.trim() || null,
        tracking_url: trackingUrl.trim() || null,
        status: extra?.status ?? shipmentStatus,
        delivered_at: extra?.delivered_at,
        shipped_at: extra?.shipped_at,
      })
      applyBundle(next)
      setNote(t("sellerOrderShipmentSaved", locale))
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerOrderNotFoundDesc", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function onUploadInvoice(file: File | null) {
    if (!orderId || !file) return
    setBusy(true)
    setError(null)
    try {
      const next = await uploadSellerOrderDocument(orderId, "invoice", file)
      applyBundle(next)
      setNote(t("sellerOrderViewInvoice", locale))
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerOrderNotFoundDesc", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function onGeneratePacking() {
    if (!orderId) return
    setBusy(true)
    setError(null)
    try {
      const next = await generateSellerPackingSlip(orderId)
      applyBundle(next)
      setNote(t("sellerOrderViewPacking", locale))
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerOrderNotFoundDesc", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function onSendMessage() {
    if (!orderId || !messageBody.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (bundle?.conversation_id) {
        router.push(`/seller/messages/${bundle.conversation_id}`)
        return
      }
      const res = await ensureSellerOrderMessage(
        orderId,
        messageBody.trim(),
        tFormat("sellerOrderTitle", locale, {
          number: bundle?.order.order_number ?? "",
        })
      )
      router.push(`/seller/messages/${res.conversation_id}`)
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerMessagesSendFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function onCreateReturn() {
    if (!returnLineId || !returnReason.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createSellerReturn(returnLineId, returnReason.trim())
      setReturnReason("")
      setNote(t("sellerOrderCreateReturn", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerOrderNotFoundDesc", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavOrders", locale), href: "/seller/orders" },
        ]}
      >
        <p className="text-xs text-wf-600">{t("loading", locale)}</p>
      </SellerGate>
    )
  }

  if (!bundle) {
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
          description={error ?? t("sellerOrderNotFoundDesc", locale)}
          primaryAction={{
            label: t("sellerOrderBackToOrders", locale),
            href: "/seller/orders",
          }}
        />
      </SellerGate>
    )
  }

  const { order, lines, returns, totals, invoice, packing_slip, return_period } =
    bundle

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavOrders", locale), href: "/seller/orders" },
        { label: order.order_number },
      ]}
    >
      <div className="mb-4">
        <h1 className="text-[19px] font-bold text-wf-900">
          {tFormat("sellerOrderTitle", locale, {
            number: order.order_number,
          })}
        </h1>
      </div>

      {note ? (
        <Notice variant="info" className="mb-4">
          {note}
        </Notice>
      ) : null}
      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-4 py-3">
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("commonOrder", locale)}
          </h2>
          <dl className="space-y-1.5">
            <CompactRow label={t("sellerReturnsOrderNumber", locale)}>
              #{order.order_number}
            </CompactRow>
            <CompactRow label={t("sellerOrderDate", locale)}>
              {new Date(order.created_at).toLocaleDateString(intl)}
            </CompactRow>
            <CompactRow label={t("sellerOrderDeliveredAt", locale)}>
              {order.delivered_at
                ? new Date(order.delivered_at).toLocaleDateString(intl)
                : "—"}
            </CompactRow>
            <CompactRow label={t("sellerOrderPaymentStatus", locale)}>
              <Badge variant="outline">
                {statusLabel(order.payment_status, locale)}
              </Badge>
            </CompactRow>
            <CompactRow label={t("sellerOrderShippingStatus", locale)}>
              <Badge variant="outline">
                {shippingStatusLabel(order.shipping_status, locale)}
              </Badge>
            </CompactRow>
            <CompactRow label={t("sellerOrderReturnPeriod", locale)}>
              {return_period.delivered_at
                ? tFormat("sellerOrderReturnPeriodDays", locale, {
                    days: return_period.period_days,
                  })
                : t("sellerOrderReturnStartsAfterDelivery", locale)}
            </CompactRow>
            {return_period.deadline_at ? (
              <CompactRow label={t("sellerOrderReturnDeadline", locale)}>
                {new Date(return_period.deadline_at).toLocaleDateString(intl)}
                {return_period.days_remaining != null
                  ? ` · ${tFormat("sellerOrderDaysRemaining", locale, {
                      days: return_period.days_remaining,
                    })}`
                  : null}
              </CompactRow>
            ) : null}
          </dl>
        </section>

        <section className="rounded-lg border border-wf-300 bg-white px-4 py-3">
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("commonCustomer", locale)}
          </h2>
          <dl className="mb-3 space-y-1.5">
            <CompactRow label={t("commonName", locale)}>
              {order.customer_name || "—"}
            </CompactRow>
            <CompactRow label={t("commonEmail", locale)}>
              {order.customer_email || "—"}
            </CompactRow>
          </dl>
          <div className="grid gap-4 border-t border-wf-200 pt-3">
            <AddressBlock
              title={t("sellerOrderBillingAddress", locale)}
              address={order.billing_address_structured}
              fallbackName={order.customer_name}
              locale={locale}
            />
            <AddressBlock
              title={t("sellerSettingsShippingAddress", locale)}
              address={order.shipping_address_structured}
              fallbackName={order.customer_name}
              locale={locale}
            />
          </div>
        </section>
      </div>

      <section className="mb-4 rounded-lg border border-wf-300 bg-white px-4 py-3">
        <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerOrderShipping", locale)}
        </h2>
        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
          <Input
            label={t("sellerOrderCarrier", locale)}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
          <Input
            label={t("sellerOrderTrackingCode", locale)}
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
          />
          <Input
            label={t("sellerOrderTrackingUrl", locale)}
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
          />
          <div>
            <label
              htmlFor="shipment-status"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
            >
              {t("sellerOrderShippingStatus", locale)}
            </label>
            <select
              id="shipment-status"
              className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
              value={shipmentStatus}
              onChange={(e) => setShipmentStatus(e.target.value)}
            >
              <option value="pending">
                {shippingStatusLabel("pending", locale)}
              </option>
              <option value="shipped">
                {shippingStatusLabel("shipped", locale)}
              </option>
              <option value="in_transit">
                {shippingStatusLabel("in_transit", locale)}
              </option>
              <option value="out_for_delivery">
                {shippingStatusLabel("out_for_delivery", locale)}
              </option>
              <option value="delivered">
                {shippingStatusLabel("delivered", locale)}
              </option>
              <option value="exception">
                {shippingStatusLabel("exception", locale)}
              </option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" disabled={busy} onClick={() => saveShipment()}>
            {t("sellerOrderSaveTracking", locale)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || order.shipping_status === "delivered"}
            onClick={() =>
              saveShipment({
                status: "delivered",
                delivered_at: new Date().toISOString(),
              })
            }
          >
            {t("sellerOrderMarkDelivered", locale)}
          </Button>
          {order.tracking_url ? (
            <a
              href={order.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-[5px] border border-wf-400 px-3 text-xs font-semibold text-wf-800 underline"
            >
              {t("sellerOrderTrackLink", locale)}
            </a>
          ) : (
            <span className="text-xs text-wf-500">
              {t("sellerOrderNoTracking", locale)}
            </span>
          )}
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-lg border border-wf-300 bg-white">
        <h2 className="border-b border-wf-300 px-4 py-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerNavProducts", locale)}
        </h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {[
                t("commonProduct", locale),
                t("commonQuantity", locale),
                t("commonPrice", locale),
                t("commonTotal", locale),
              ].map((h) => (
                <th
                  key={h}
                  className="border-b border-wf-400 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const unit = unitPrice(line.unit_price ?? line.unit_price_snapshot)
              return (
                <tr
                  key={line.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2 text-wf-800">
                    <div className="font-medium">
                      {line.product_name || line.product_label}
                    </div>
                    {line.variant_name ? (
                      <div className="text-wf-600">{line.variant_name}</div>
                    ) : null}
                    {line.sku ? (
                      <div className="text-wf-500">
                        {t("commonSku", locale)}: {line.sku}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">{line.quantity}</td>
                  <td className="px-4 py-2">{formatEuro(unit)}</td>
                  <td className="px-4 py-2">
                    {formatEuro(unit * line.quantity)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mb-4 rounded-lg border border-wf-300 bg-white px-4 py-3">
        <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerOrderFinancial", locale)}
        </h2>
        <dl className="max-w-md space-y-1.5">
          <CompactRow label={t("sellerOrderDeliveryCountry", locale)}>
            {totals.delivery_country_code ||
              order.shipping_country_code ||
              "—"}
          </CompactRow>
          <CompactRow label={t("sellerOrderVatRate", locale)}>
            {totals.vat_rate != null
              ? `${Math.round(Number(totals.vat_rate) * 1000) / 10}%`
              : "—"}
          </CompactRow>
          <CompactRow label={t("sellerOrderSubtotal", locale)}>
            {formatEuro(totals.subtotal)}
          </CompactRow>
          <CompactRow label={t("sellerOrderShippingCost", locale)}>
            {formatEuro(totals.shipping_cost)}
          </CompactRow>
          <CompactRow label={t("sellerFinanceVatLabel", locale)}>
            {formatEuro(totals.vat)}
          </CompactRow>
          <CompactRow label={t("sellerOrderGrandTotal", locale)}>
            <span className="font-semibold">{formatEuro(totals.total)}</span>
          </CompactRow>
        </dl>
      </section>

      <section className="mb-4 rounded-lg border border-wf-300 bg-white px-4 py-3">
        <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerOrderDocuments", locale)}
        </h2>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div className="text-xs">
            <p className="mb-2 font-semibold text-wf-800">
              {t("sellerOrderInvoiceLabel", locale)}
            </p>
            {invoice ? (
              <div className="mb-2 flex flex-wrap gap-2">
                <a
                  href={invoice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  {t("sellerOrderViewInvoice", locale)}
                </a>
                <span className="text-wf-500">{invoice.filename}</span>
              </div>
            ) : (
              <p className="mb-2 text-wf-500">
                {t("sellerOrderInvoiceMissing", locale)}
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-[11px] text-wf-500">
                {invoice
                  ? t("sellerOrderReplaceInvoice", locale)
                  : t("sellerOrderUploadInvoice", locale)}
              </span>
              <input
                type="file"
                accept={DOC_ACCEPT}
                disabled={busy}
                onChange={(e) =>
                  onUploadInvoice(e.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>
          <div className="text-xs">
            <p className="mb-2 font-semibold text-wf-800">
              {t("sellerOrderPackingLabel", locale)}
            </p>
            {packing_slip ? (
              <div className="mb-2 flex flex-wrap gap-2">
                <a
                  href={packing_slip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  {t("sellerOrderViewPacking", locale)}
                </a>
                <a
                  href={packing_slip.url}
                  download={packing_slip.filename}
                  className="font-semibold underline"
                >
                  {t("sellerOrderDownloadPacking", locale)}
                </a>
                <span className="text-wf-500">{packing_slip.filename}</span>
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void onGeneratePacking()}
            >
              {packing_slip
                ? t("sellerOrderReplacePacking", locale)
                : t("sellerOrderGeneratePacking", locale)}
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-lg border border-wf-300 bg-white px-4 py-3">
        <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerNavMessages", locale)}
        </h2>
        {bundle.conversation_id ? (
          <p className="mb-2 text-xs">
            <Link
              href={`/seller/messages/${bundle.conversation_id}`}
              className="font-semibold underline"
            >
              {t("sellerMessagesConversation", locale)}
            </Link>
          </p>
        ) : null}
        <Input
          label={t("sellerOrderSendMessage", locale)}
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          placeholder={t("sellerMessagesReplyPlaceholder", locale)}
        />
        <div className="mt-3">
          <Button
            type="button"
            disabled={busy || (!bundle.conversation_id && !messageBody.trim())}
            onClick={() => {
              if (bundle.conversation_id && !messageBody.trim()) {
                router.push(`/seller/messages/${bundle.conversation_id}`)
                return
              }
              void onSendMessage()
            }}
          >
            {t("sellerOrderSendMessage", locale)}
          </Button>
        </div>
      </section>

      <section className="mb-4 rounded-lg border border-wf-300 bg-white px-4 py-3">
        <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerNavReturns", locale)}
        </h2>
        {returns.length === 0 ? (
          <p className="mb-3 text-xs text-wf-500">{t("commonNone", locale)}</p>
        ) : (
          <ul className="mb-3 space-y-2 text-xs">
            {returns.map((ret) => (
              <li
                key={ret.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-wf-200 px-3 py-2"
              >
                <div>
                  <Link
                    href={`/seller/returns/${ret.id}`}
                    className="font-semibold underline"
                  >
                    {ret.product_name || ret.id}
                  </Link>
                  <p className="mt-0.5 text-wf-600">{ret.reason}</p>
                </div>
                <Badge variant="outline">
                  {returnStatusLabel(ret.status, locale)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
          <div>
            <label
              htmlFor="return-line"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
            >
              {t("commonProduct", locale)}
            </label>
            <select
              id="return-line"
              className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
              value={returnLineId}
              onChange={(e) => setReturnLineId(e.target.value)}
            >
              <option value="">—</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.product_name || line.product_label} ×{line.quantity}
                  {line.sku ? ` · ${line.sku}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={t("sellerReturnsReasonComments", locale)}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Button
            type="button"
            disabled={busy || !returnLineId || !returnReason.trim()}
            onClick={onCreateReturn}
          >
            {t("sellerOrderCreateReturn", locale)}
          </Button>
        </div>
      </section>
    </SellerGate>
  )
}
