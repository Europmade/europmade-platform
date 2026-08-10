"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Notice } from "@europmade/ui"
import { BuyerGate } from "../../_components/buyer-gate"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  OrderServiceApiError,
  getOrder,
  listReturns,
  type OrderLineView,
  type ReturnView,
} from "../../../_lib/order-service-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

function money(unit: string | number, qty: number): number {
  const n = typeof unit === "number" ? unit : Number(unit)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * qty * 100) / 100
}

export default function BuyerOrderDetailPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ id: string }>()
  const orderId = params.id
  const [order, setOrder] = useState<Awaited<
    ReturnType<typeof getOrder>
  > | null>(null)
  const [returns, setReturns] = useState<ReturnView[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getOrder(orderId), listReturns()])
      .then(([detail, retRes]) => {
        if (cancelled) return
        setOrder(detail)
        setReturns(
          retRes.returns.filter((r) => r.order_id === orderId)
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("buyerOrderLoadError", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [orderId, locale])

  const returnByLine = new Map(returns.map((r) => [r.order_line_id, r]))

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavOrders", locale), href: "/account/orders" },
        {
          label: order
            ? `#${order.order.order_number}`
            : t("buyerOrderDetail", locale),
        },
      ]}
    >
      {error ? (
        <Notice variant="warning">{error}</Notice>
      ) : !order ? (
        <p className="text-xs text-wf-600">{t("loading", locale)}</p>
      ) : (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {tFormat("buyerOrderTitle", locale, {
              number: order.order.order_number,
            })}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {tFormat("buyerPaymentStatus", locale, {
              status: statusLabel(order.order.payment_status, locale),
            })}
            {order.order_set
              ? ` · Ref ${order.order_set.payment_reference}`
              : ""}
          </p>

          <div className="mt-5 grid gap-3 tablet:grid-cols-2">
            <div className="rounded-md border border-wf-300 p-3 text-xs">
              <div className="font-semibold text-wf-800">
                {t("buyerShippingAddress", locale)}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-wf-700">
                {order.order.shipping_address}
              </p>
            </div>
            <div className="rounded-md border border-wf-300 p-3 text-xs">
              <div className="font-semibold text-wf-800">
                {t("buyerBillingAddress", locale)}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-wf-700">
                {order.order.billing_address}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-wf-500">
            {t("buyerTrackTraceNote", locale)}
          </p>

          <div className="mt-5">
            <Link
              href={`/account/messages/${order.order.id}`}
              className="text-xs font-semibold text-wf-900 underline"
            >
              {t("buyerMessagesForOrder", locale)}
            </Link>
          </div>

          <h2 className="mt-6 text-sm font-bold text-wf-900">
            {t("buyerOrderLines", locale)}
          </h2>
          <ul className="mt-3 divide-y divide-wf-200 rounded-md border border-wf-300">
            {order.lines.map((line: OrderLineView) => {
              const ret = returnByLine.get(line.id)
              const open =
                ret &&
                ["Aangevraagd", "Bevestigd", "Ontvangen", "Geëscaleerd"].includes(
                  ret.status
                )
              return (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-xs"
                >
                  <div>
                    <div className="font-medium text-wf-900">
                      Offer {line.offer_id}
                    </div>
                    <div className="mt-0.5 text-wf-600">
                      {line.quantity} ×{" "}
                      {formatEuro(money(line.unit_price_snapshot, 1))} ={" "}
                      {formatEuro(money(line.unit_price_snapshot, line.quantity))}
                    </div>
                    {ret ? (
                      <div className="mt-1">
                        <Badge variant="outline">
                          {tFormat("buyerReturnBadge", locale, {
                            status: statusLabel(ret.status, locale),
                          })}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {ret ? (
                      <Link
                        href={`/account/returns/${ret.id}`}
                        className="font-semibold text-wf-900 hover:underline"
                      >
                        {t("buyerViewReturn", locale)}
                      </Link>
                    ) : null}
                    {!open && !ret ? (
                      <Link
                        href={`/account/returns/new?order_line_id=${line.id}&order_id=${order.order.id}`}
                        className="rounded-md bg-wf-900 px-3 py-1.5 font-semibold text-white hover:bg-wf-800"
                      >
                        {t("buyerRequestReturn", locale)}
                      </Link>
                    ) : null}
                    <Link
                      href={`/account/reviews/new?order_line_id=${line.id}&type=Productreview`}
                      className="rounded-md border border-wf-400 px-3 py-1.5 font-semibold text-wf-900 hover:bg-wf-100"
                    >
                      {t("buyerWriteReview", locale)}
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </BuyerGate>
  )
}
