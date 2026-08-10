"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import { BuyerGate } from "../../_components/buyer-gate"
import {
  OrderServiceApiError,
  requestReturn,
} from "../../../_lib/order-service-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

function ReturnForm() {
  const locale = useStorefrontLocale()
  const router = useRouter()
  const search = useSearchParams()
  const orderLineId = search.get("order_line_id") ?? ""
  const orderId = search.get("order_id") ?? ""
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderLineId) {
      setError(t("buyerNoOrderLineSelected", locale))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await requestReturn(orderLineId, reason)
      router.replace(`/account/returns/${result.return.id}`)
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("buyerReturnRequestFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavOrders", locale), href: "/account/orders" },
        ...(orderId
          ? [
              {
                label: t("commonOrder", locale),
                href: `/account/orders/${orderId}`,
              },
            ]
          : []),
        { label: t("buyerRequestReturn", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("buyerNewReturn", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("buyerReturnWindowNote", locale)}
      </p>

      {!orderLineId ? (
        <Notice variant="warning" className="mt-4">
          {t("buyerSelectOrderLine", locale)}
        </Notice>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 max-w-lg space-y-4">
          <div className="text-xs text-wf-600">
            {t("buyerOrderLineLabel", locale)}:{" "}
            <span className="font-mono text-wf-800">{orderLineId}</span>
          </div>
          <label className="block text-xs font-semibold text-wf-800">
            {t("buyerReason", locale)}
            <textarea
              className="mt-1.5 w-full rounded-md border border-wf-400 px-3 py-2 text-sm text-wf-900"
              rows={4}
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("buyerReasonPlaceholder", locale)}
            />
          </label>
          {error ? <Notice variant="warning">{error}</Notice> : null}
          <Button type="submit" disabled={busy || reason.trim().length < 3}>
            {busy
              ? t("buyerSubmitting", locale)
              : t("buyerSubmitReturn", locale)}
          </Button>
        </form>
      )}
    </BuyerGate>
  )
}

export default function NewReturnPage() {
  const locale = useStorefrontLocale()
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-wf-600">
          {t("loading", locale)}
        </div>
      }
    >
      <ReturnForm />
    </Suspense>
  )
}
