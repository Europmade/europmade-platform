"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  OrderServiceApiError,
  listSellerReturns,
  sellerReturnAction,
  updateSellerReturnTracking,
  type ReturnView,
} from "../../../_lib/order-service-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

type SellerReturnRow = ReturnView & {
  order_id: string
  order_number: string
  customer_id: string
  offer_id: string
}

function returnStatusLabel(status: string, locale: Parameters<typeof t>[1]) {
  if (status === "Aangevraagd") return t("sellerReturnStatusRequested", locale)
  if (status === "Bevestigd") return t("sellerReturnStatusConfirmed", locale)
  if (status === "Onderweg") return t("sellerReturnStatusInTransit", locale)
  if (status === "Ontvangen") return t("sellerReturnStatusReceived", locale)
  if (status === "Verwerkt") return t("sellerReturnStatusRefunded", locale)
  return statusLabel(status, locale)
}

export default function SellerReturnDetailPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const params = useParams<{ id: string }>()
  const returnId = params.id

  const [ret, setRet] = useState<SellerReturnRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [carrier, setCarrier] = useState("")
  const [trackingCode, setTrackingCode] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")

  const applyReturn = useCallback((next: SellerReturnRow) => {
    setRet(next)
    setCarrier(next.carrier ?? "")
    setTrackingCode(next.tracking_code ?? "")
    setTrackingUrl(next.tracking_url ?? "")
  }, [])

  const load = useCallback(() => {
    if (!returnId) return
    setLoading(true)
    setError(null)
    listSellerReturns()
      .then((res) => {
        const found = res.returns.find((r) => r.id === returnId) ?? null
        if (found) applyReturn(found)
        else setRet(null)
      })
      .catch((err: unknown) => {
        setRet(null)
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("sellerReturnsNotFoundDesc", locale)
        )
      })
      .finally(() => setLoading(false))
  }, [returnId, locale, applyReturn])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(
    action: "confirm" | "receive" | "approve" | "reject",
    successNote: string
  ) {
    if (!returnId) return
    setBusy(true)
    setError(null)
    try {
      const res = await sellerReturnAction(
        returnId,
        action,
        action === "reject" ? rejectReason.trim() : undefined
      )
      if (ret) {
        applyReturn({ ...ret, ...res.return })
      }
      setNote(successNote)
      if (action === "reject") setRejectReason("")
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerReturnsNotFoundDesc", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveTracking(markInTransit = false) {
    if (!returnId) return
    setBusy(true)
    setError(null)
    try {
      const res = await updateSellerReturnTracking(returnId, {
        carrier: carrier.trim() || null,
        tracking_code: trackingCode.trim() || null,
        tracking_url: trackingUrl.trim() || null,
        mark_in_transit: markInTransit,
      })
      if (ret) applyReturn({ ...ret, ...res.return })
      setNote(t("sellerOrderShipmentSaved", locale))
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerReturnsNotFoundDesc", locale)
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
          { label: t("sellerNavReturns", locale), href: "/seller/returns" },
        ]}
      >
        <p className="text-xs text-wf-600">{t("loading", locale)}</p>
      </SellerGate>
    )
  }

  if (!ret) {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavReturns", locale), href: "/seller/returns" },
          { label: t("commonUnknown", locale) },
        ]}
      >
        <EmptyState
          title={t("sellerReturnsNotFoundTitle", locale)}
          description={error ?? t("sellerReturnsNotFoundDesc", locale)}
          primaryAction={{
            label: t("commonBack", locale),
            href: "/seller/returns",
          }}
        />
      </SellerGate>
    )
  }

  const status = ret.status

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavReturns", locale), href: "/seller/returns" },
        { label: ret.id },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {ret.product_name && ret.product_name !== "—"
              ? ret.product_name
              : ret.id}
          </h1>
          {ret.variant_name ? (
            <p className="mt-1 text-xs text-wf-600">{ret.variant_name}</p>
          ) : null}
          {ret.sku ? (
            <p className="mt-1 text-xs text-wf-500">
              {t("commonSku", locale)}: {ret.sku}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-wf-600">
            {tFormat("sellerReturnsOrderCustomer", locale, {
              order: ret.order_number,
              customer: ret.customer_id,
            })}
          </p>
        </div>
        <Badge variant="outline">{returnStatusLabel(status, locale)}</Badge>
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

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4 text-xs">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerReturnsSection", locale)}
          </h2>
          <dl className="grid gap-2">
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("sellerReturnsNumber", locale)}</dt>
              <dd>{ret.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">
                {t("sellerReturnsOrderNumber", locale)}
              </dt>
              <dd>
                <Link
                  href={`/seller/orders/${ret.order_id}`}
                  className="underline"
                >
                  #{ret.order_number}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("commonCustomer", locale)}</dt>
              <dd>{ret.customer_id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("commonAmount", locale)}</dt>
              <dd>
                {ret.refund_amount != null
                  ? formatEuro(Number(ret.refund_amount) || 0)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">
                {t("sellerReturnRefundStatus", locale)}
              </dt>
              <dd>
                {ret.refund_status
                  ? statusLabel(ret.refund_status, locale)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("commonDate", locale)}</dt>
              <dd>{new Date(ret.created_at).toLocaleString(intl)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4 text-xs">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerReturnsReasonComments", locale)}
          </h2>
          <p className="font-semibold text-wf-800">{ret.reason}</p>
          {ret.seller_decision_reason ? (
            <p className="mt-2 text-wf-700">{ret.seller_decision_reason}</p>
          ) : null}
        </section>
      </div>

      <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerReturnTracking", locale)}
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
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => saveTracking(false)}
          >
            {t("sellerOrderSaveTracking", locale)}
          </Button>
          {ret.tracking_url ? (
            <a
              href={ret.tracking_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-[5px] border border-wf-400 px-3 text-xs font-semibold underline"
            >
              {t("sellerOrderTrackLink", locale)}
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("commonActions", locale)}
        </h2>
        <div className="flex flex-wrap gap-2">
          {status === "Aangevraagd" ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction("confirm", t("sellerReturnsAccepted", locale))
              }
            >
              {t("sellerReturnsAccept", locale)}
            </Button>
          ) : null}
          {status === "Bevestigd" || status === "Onderweg" ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction("receive", t("sellerReturnMarkReceived", locale))
              }
            >
              {t("sellerReturnMarkReceived", locale)}
            </Button>
          ) : null}
          {status === "Ontvangen" ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction("approve", t("sellerReturnProcessRefund", locale))
              }
            >
              {t("sellerReturnProcessRefund", locale)}
            </Button>
          ) : null}
          {["Aangevraagd", "Bevestigd", "Onderweg", "Ontvangen"].includes(
            status
          ) ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !rejectReason.trim()}
              onClick={() =>
                runAction("reject", t("sellerReturnsRejected", locale))
              }
            >
              {t("sellerReturnsReject", locale)}
            </Button>
          ) : null}
        </div>
        {["Aangevraagd", "Bevestigd", "Onderweg", "Ontvangen"].includes(
          status
        ) ? (
          <div className="mt-4 max-w-xl">
            <Input
              label={t("sellerReturnsAskInfo", locale)}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("sellerReturnsAskInfoPlaceholder", locale)}
            />
          </div>
        ) : null}
      </section>
    </SellerGate>
  )
}
