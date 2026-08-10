"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { BuyerGate } from "../_components/buyer-gate"
import {
  OrderServiceApiError,
  listMessageThreads,
  type MessageThreadSummary,
} from "../../_lib/order-service-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../_lib/i18n/messages"

export default function BuyerMessagesPage() {
  const locale = useStorefrontLocale()
  const [threads, setThreads] = useState<
    MessageThreadSummary[] | "loading" | "error"
  >("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMessageThreads()
      .then((res) => {
        if (!cancelled) setThreads(res.threads)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setThreads("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("buyerMessagesLoadError", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavMessages", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("buyerNavMessages", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("buyerMessagesIntro", locale)}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {threads === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">{t("loading", locale)}</p>
      ) : threads === "error" || threads.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">
          {t("buyerMessagesEmpty", locale)}{" "}
          <Link href="/account/orders" className="font-semibold underline">
            {t("buyerNavOrders", locale)}
          </Link>
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-wf-200 rounded-md border border-wf-300">
          {threads.map((thread) => (
            <li key={thread.order_id}>
              <Link
                href={`/account/messages/${thread.order_id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs hover:bg-wf-50"
              >
                <div>
                  <div className="font-semibold text-wf-900">
                    {t("commonOrder", locale)} #{thread.order_number}
                  </div>
                  <div className="mt-0.5 text-wf-600">
                    {thread.last_body_preview ??
                      t("buyerNoMessagesStart", locale)}
                  </div>
                </div>
                <span className="text-wf-500">
                  {tFormat("buyerMessageCount", locale, {
                    count: thread.message_count,
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BuyerGate>
  )
}
