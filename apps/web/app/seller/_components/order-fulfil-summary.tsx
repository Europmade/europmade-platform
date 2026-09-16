"use client"

import Link from "next/link"
import { Badge } from "@europmade/ui"
import type { SellerOrderBundle } from "../../_lib/order-service-api"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"
import { formatEuro } from "../../_components/storefront-shell"

function shippingStatusLabel(status: string, locale: StorefrontLocale) {
  if (status === "pending") return t("sellerShipStatusPending", locale)
  if (status === "shipped") return t("sellerShipStatusShipped", locale)
  if (status === "in_transit") return t("sellerShipStatusInTransit", locale)
  if (status === "out_for_delivery")
    return t("sellerShipStatusOutForDelivery", locale)
  if (status === "delivered") return t("sellerShipStatusDelivered", locale)
  if (status === "exception") return t("sellerShipStatusException", locale)
  return statusLabel(status, locale)
}

function returnStatusLabel(status: string, locale: StorefrontLocale) {
  if (status === "Aangevraagd") return t("sellerReturnStatusRequested", locale)
  if (status === "Bevestigd") return t("sellerReturnStatusConfirmed", locale)
  if (status === "Onderweg") return t("sellerReturnStatusInTransit", locale)
  if (status === "Ontvangen") return t("sellerReturnStatusReceived", locale)
  if (status === "Verwerkt") return t("sellerReturnStatusRefunded", locale)
  return statusLabel(status, locale)
}

function refundStatusLabel(status: string | null | undefined, locale: StorefrontLocale) {
  if (!status) return null
  if (status === "requested" || status === "Pending")
    return t("sellerRefundStatusRequested", locale)
  if (status === "processing") return t("sellerRefundStatusProcessing", locale)
  if (status === "processed" || status === "Uitgevoerd")
    return t("sellerRefundStatusProcessed", locale)
  if (status === "failed") return t("sellerRefundStatusFailed", locale)
  if (status === "forced" || status === "Geforceerd")
    return t("sellerRefundStatusForced", locale)
  return statusLabel(status, locale)
}

export function OrderFulfilmentSummary({
  bundle,
  locale,
  compact = false,
}: {
  bundle: SellerOrderBundle
  locale: StorefrontLocale
  compact?: boolean
}) {
  const intl = storefrontIntlLocale(locale)
  const { order, lines, returns, return_period } = bundle
  const pad = compact ? "px-4 py-3" : "px-5 py-4"
  const hasDelivery = Boolean(return_period.delivered_at)

  return (
    <section
      className={`rounded-lg border border-wf-300 bg-white text-xs text-wf-800 ${pad}`}
    >
      <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
        {t("sellerMsgOrderSummary", locale)}
      </h2>
      <dl className="grid gap-2">
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-wf-500">{t("sellerReturnsOrderNumber", locale)}</dt>
          <dd className="font-medium">#{order.order_number}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-wf-500">{t("sellerOrderDate", locale)}</dt>
          <dd>{new Date(order.created_at).toLocaleDateString(intl)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-wf-500">{t("sellerOrderDeliveredAt", locale)}</dt>
          <dd>
            {order.delivered_at
              ? new Date(order.delivered_at).toLocaleDateString(intl)
              : "—"}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-wf-500">
            {t("sellerOrderShippingStatus", locale)}
          </dt>
          <dd>
            <Badge variant="outline">
              {shippingStatusLabel(order.shipping_status, locale)}
            </Badge>
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-wf-500">{t("sellerOrderTracking", locale)}</dt>
          <dd className="min-w-0">
            {order.carrier ? (
              <span className="block text-wf-600">{order.carrier}</span>
            ) : null}
            {order.tracking_code ? (
              <span className="block">{order.tracking_code}</span>
            ) : (
              <span className="text-wf-500">
                {t("sellerOrderNoTracking", locale)}
              </span>
            )}
            {order.tracking_url ? (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                {t("sellerOrderTrackLink", locale)}
              </a>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-wf-200 pt-3">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-wf-500">
          {t("sellerNavProducts", locale)}
        </p>
        <ul className="space-y-2">
          {lines.map((line) => {
            const name =
              line.product_name || line.product_label || "—"
            const unit = Number(line.unit_price ?? line.unit_price_snapshot) || 0
            return (
              <li key={line.id} className="space-y-0.5">
                <div className="flex justify-between gap-2 font-medium">
                  <span className="truncate">{name}</span>
                  <span className="shrink-0">×{line.quantity}</span>
                </div>
                {line.variant_name ? (
                  <div className="text-wf-600">{line.variant_name}</div>
                ) : null}
                {line.sku ? (
                  <div className="text-wf-500">
                    {t("commonSku", locale)}: {line.sku}
                  </div>
                ) : null}
                <div className="flex justify-between gap-2 text-wf-600">
                  <span>{formatEuro(unit)}</span>
                  <span>{formatEuro(unit * line.quantity)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-3 border-t border-wf-200 pt-3">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-wf-500">
          {t("sellerOrderReturnPeriod", locale)}
        </p>
        {hasDelivery ? (
          <dl className="grid gap-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">{t("sellerOrderDeliveredAt", locale)}</dt>
              <dd>
                {new Date(return_period.delivered_at!).toLocaleDateString(intl)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">
                {t("sellerOrderReturnPeriod", locale)}
              </dt>
              <dd>
                {tFormat("sellerOrderReturnPeriodDays", locale, {
                  days: return_period.period_days,
                })}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">
                {t("sellerOrderReturnDeadline", locale)}
              </dt>
              <dd>
                {return_period.deadline_at
                  ? new Date(return_period.deadline_at).toLocaleDateString(intl)
                  : "—"}
              </dd>
            </div>
            {return_period.days_remaining != null ? (
              <div className="flex justify-between gap-3">
                <dt className="text-wf-500"> </dt>
                <dd>
                  {tFormat("sellerOrderDaysRemaining", locale, {
                    days: return_period.days_remaining,
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-wf-500">
            {t("sellerOrderReturnStartsAfterDelivery", locale)}
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-wf-200 pt-3">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-wf-500">
          {t("sellerMsgReturnInfo", locale)}
        </p>
        {returns.length === 0 ? (
          <p className="text-wf-500">{t("commonNone", locale)}</p>
        ) : (
          <ul className="space-y-2">
            {returns.map((ret) => (
              <li
                key={ret.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/seller/returns/${ret.id}`}
                    className="font-semibold underline"
                  >
                    {ret.product_name || ret.id.slice(0, 12)}
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {returnStatusLabel(ret.status, locale)}
                  </Badge>
                  {ret.refund_status ? (
                    <span className="text-wf-500">
                      {t("sellerReturnRefundStatus", locale)}:{" "}
                      {refundStatusLabel(ret.refund_status, locale)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
