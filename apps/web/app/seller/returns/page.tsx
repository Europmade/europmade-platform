"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import {
  OrderServiceApiError,
  listSellerReturns,
  type ReturnView,
} from "../../_lib/order-service-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

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

export default function SellerReturnsPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [returns, setReturns] = useState<SellerReturnRow[] | "loading">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    listSellerReturns()
      .then((res) => setReturns(res.returns))
      .catch((err: unknown) => {
        setReturns([])
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("sellerReturnsEmptyDesc", locale)
        )
      })
  }, [locale])

  useEffect(() => {
    load()
  }, [load])

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavReturns", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerNavReturns", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerReturnsIntro", locale)}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {returns === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">{t("loading", locale)}</p>
      ) : returns.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("sellerReturnsEmptyTitle", locale)}
            description={t("sellerReturnsEmptyDesc", locale)}
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {returns.map((ret) => (
            <li
              key={ret.id}
              className="rounded-lg border border-wf-300 bg-white p-4 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-wf-900">
                    {ret.product_name && ret.product_name !== "—"
                      ? ret.product_name
                      : ret.id}{" "}
                    · {t("commonOrder", locale)} #{ret.order_number}
                  </div>
                  {ret.sku ? (
                    <div className="mt-0.5 text-wf-500">
                      {t("commonSku", locale)}: {ret.sku}
                    </div>
                  ) : null}
                  <div className="mt-1 text-wf-700">{ret.reason}</div>
                  <div className="mt-1 text-wf-500">
                    {ret.customer_id} ·{" "}
                    {new Date(ret.created_at).toLocaleDateString(intl)}
                    {ret.refund_amount != null
                      ? ` · ${formatEuro(Number(ret.refund_amount) || 0)}`
                      : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {returnStatusLabel(ret.status, locale)}
                  </Badge>
                  <Link
                    href={`/seller/returns/${ret.id}`}
                    className="font-semibold underline"
                  >
                    {t("commonOpen", locale)}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SellerGate>
  )
}
