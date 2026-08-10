"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { BuyerGate } from "../../_components/buyer-gate"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  OrderServiceApiError,
  escalateReturn,
  getReturn,
} from "../../../_lib/order-service-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

export default function BuyerReturnDetailPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<Awaited<ReturnType<typeof getReturn>> | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getReturn(params.id)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("buyerReturnLoadError", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [params.id, locale])

  async function onEscalate() {
    setBusy(true)
    setError(null)
    try {
      const res = await escalateReturn(params.id)
      setData((prev) => (prev ? { ...prev, return: res.return } : prev))
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("buyerEscalateFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  const ret = data?.return
  const amount =
    ret?.refund_amount != null
      ? typeof ret.refund_amount === "number"
        ? ret.refund_amount
        : Number(ret.refund_amount)
      : null

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavReturns", locale), href: "/account/returns" },
        { label: ret ? ret.id.slice(0, 12) : t("buyerDetail", locale) },
      ]}
    >
      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

      {!data || !ret ? (
        <p className="text-xs text-wf-600">{t("loading", locale)}</p>
      ) : (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("buyerReturnStatus", locale)}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {t("commonOrder", locale)}{" "}
            <Link
              href={`/account/orders/${data.order_id}`}
              className="font-semibold underline"
            >
              #{data.order_number}
            </Link>
          </p>

          <div className="mt-5 space-y-3 rounded-md border border-wf-300 p-4 text-xs">
            <div>
              <span className="text-wf-600">
                {t("commonStatus", locale)}:{" "}
              </span>
              <Badge variant="outline">
                {statusLabel(ret.status, locale)}
              </Badge>
            </div>
            <div>
              <span className="text-wf-600">
                {t("buyerReason", locale)}:{" "}
              </span>
              <span className="text-wf-900">{ret.reason}</span>
            </div>
            {ret.seller_decision_reason ? (
              <div>
                <span className="text-wf-600">
                  {t("buyerSellerDecision", locale)}:{" "}
                </span>
                <span className="text-wf-900">{ret.seller_decision_reason}</span>
              </div>
            ) : null}
            {ret.refund_status ? (
              <div>
                <span className="text-wf-600">
                  {t("buyerRefund", locale)}:{" "}
                </span>
                <span className="text-wf-900">
                  {statusLabel(ret.refund_status, locale)}
                  {amount != null && Number.isFinite(amount)
                    ? ` · ${formatEuro(amount)}`
                    : ""}
                </span>
              </div>
            ) : null}
          </div>

          {ret.status === "Afgewezen" ? (
            <div className="mt-4">
              <Button type="button" disabled={busy} onClick={onEscalate}>
                {t("buyerEscalate", locale)}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </BuyerGate>
  )
}
