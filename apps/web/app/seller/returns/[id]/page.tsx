"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useDemoReturns } from "../../_lib/demo-store"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

export default function SellerReturnDetailPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ id: string }>()
  const [returns, setReturns] = useDemoReturns()
  const ret = useMemo(
    () => returns.find((r) => r.id === params.id),
    [returns, params.id]
  )
  const [note, setNote] = useState<string | null>(null)
  const [infoRequest, setInfoRequest] = useState("")

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
          description={t("sellerReturnsNotFoundDesc", locale)}
          primaryAction={{
            label: t("commonBack", locale),
            href: "/seller/returns",
          }}
        />
      </SellerGate>
    )
  }

  function setStatus(status: string, message: string) {
    setReturns((prev) =>
      prev.map((r) => (r.id === ret!.id ? { ...r, status } : r))
    )
    setNote(message)
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavReturns", locale), href: "/seller/returns" },
        { label: ret.return_number },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {ret.return_number}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {tFormat("sellerReturnsOrderCustomer", locale, {
              order: ret.order_number,
              customer: ret.customer_name,
            })}
          </p>
        </div>
        <Badge variant="outline">{statusLabel(ret.status, locale)}</Badge>
      </div>

      {note ? (
        <Notice variant="info" className="mb-4">
          {note}
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
              <dd>{ret.return_number}</dd>
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
                  {ret.order_number}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("commonCustomer", locale)}</dt>
              <dd>{ret.customer_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("commonEmail", locale)}</dt>
              <dd>{ret.customer_email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">{t("commonAmount", locale)}</dt>
              <dd>{formatEuro(ret.amount)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4 text-xs">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerReturnsReasonComments", locale)}
          </h2>
          <p className="font-semibold text-wf-800">{ret.reason}</p>
          <p className="mt-2 text-wf-700">{ret.comments}</p>
          <div className="mt-4">
            <p className="mb-1 text-wf-500">{t("sellerReturnsPhotos", locale)}</p>
            <ul className="space-y-1">
              {ret.photo_labels.map((photo) => (
                <li key={photo} className="underline">
                  {photo}
                </li>
              ))}
            </ul>
          </div>
          {ret.message_id ? (
            <p className="mt-4">
              <Link
                href={`/seller/messages/${ret.message_id}`}
                className="font-semibold underline"
              >
                {t("sellerReturnsOpenMessage", locale)}
              </Link>
            </p>
          ) : null}
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
                t("commonProduct", locale),
                t("commonSku", locale),
                t("commonQuantity", locale),
                t("commonPrice", locale),
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
            {ret.products.map((p) => (
              <tr key={p.sku} className="border-b border-wf-200 last:border-b-0">
                <td className="px-4 py-2.5">{p.product_name}</td>
                <td className="px-4 py-2.5">{p.sku}</td>
                <td className="px-4 py-2.5">{p.quantity}</td>
                <td className="px-4 py-2.5">{formatEuro(p.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("commonActions", locale)}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              setStatus("Geaccepteerd", t("sellerReturnsAccepted", locale))
            }
          >
            {t("sellerReturnsAccept", locale)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setStatus("Afgewezen", t("sellerReturnsRejected", locale))
            }
          >
            {t("sellerReturnsReject", locale)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setStatus(
                "In behandeling",
                t("sellerReturnsProcessingNote", locale)
              )
            }
          >
            {t("sellerReturnsSetProcessing", locale)}
          </Button>
        </div>
        <div className="mt-4 max-w-xl">
          <Input
            label={t("sellerReturnsAskInfo", locale)}
            value={infoRequest}
            onChange={(e) => setInfoRequest(e.target.value)}
            placeholder={t("sellerReturnsAskInfoPlaceholder", locale)}
          />
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!infoRequest.trim()}
              onClick={() => {
                setStatus(
                  "Informatie gevraagd",
                  tFormat("sellerReturnsInfoSent", locale, {
                    text: infoRequest.trim(),
                  })
                )
                setInfoRequest("")
              }}
            >
              {t("sellerReturnsSendRequest", locale)}
            </Button>
          </div>
        </div>
      </section>
    </SellerGate>
  )
}
