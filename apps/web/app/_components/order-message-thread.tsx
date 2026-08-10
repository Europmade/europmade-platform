"use client"

import { useCallback, useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  OrderServiceApiError,
  listOrderMessages,
  sendOrderMessage,
  type MessageView,
} from "../_lib/order-service-api"
import { useStorefrontLocale } from "../_lib/i18n/use-storefront-locale"
import type { StorefrontLocale } from "../_lib/i18n/locales"
import { t, tFormat } from "../_lib/i18n/messages"

function dateTimeLocale(locale: StorefrontLocale): string {
  if (locale === "en") return "en-GB"
  if (locale === "de") return "de-DE"
  if (locale === "fr") return "fr-FR"
  return "nl-NL"
}

export function OrderMessageThread({ orderId }: { orderId: string }) {
  const locale = useStorefrontLocale()
  const [messages, setMessages] = useState<MessageView[] | "loading">("loading")
  const [orderNumber, setOrderNumber] = useState<string>("")
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    listOrderMessages(orderId)
      .then((res) => {
        setMessages(res.messages)
        setOrderNumber(res.order_number)
        setViewerId(res.viewer_customer_id)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("buyerThreadLoadFailed", locale)
        )
        setMessages([])
      })
  }, [orderId, locale])

  useEffect(() => {
    load()
  }, [load])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (body.trim().length < 1) return
    setBusy(true)
    setError(null)
    try {
      await sendOrderMessage(orderId, body)
      setBody("")
      load()
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("buyerSendFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {orderNumber ? (
        <p className="mb-3 text-xs text-wf-600">
          {tFormat("buyerConversationForOrder", locale, {
            number: orderNumber,
          })}
        </p>
      ) : null}

      {error ? (
        <Notice variant="warning" className="mb-3">
          {error}
        </Notice>
      ) : null}

      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border border-wf-300 bg-wf-50 p-3">
        {messages === "loading" ? (
          <p className="text-xs text-wf-600">{t("loading", locale)}</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-wf-600">
            {t("buyerThreadEmpty", locale)}
          </p>
        ) : (
          messages.map((m) => {
            const mine = viewerId != null && m.sender_customer_id === viewerId
            return (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-md px-3 py-2 text-xs ${
                  mine
                    ? "ml-auto bg-wf-900 text-white"
                    : "mr-auto border border-wf-300 bg-white text-wf-800"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div
                  className={`mt-1 text-[10px] ${
                    mine ? "text-wf-300" : "text-wf-500"
                  }`}
                >
                  {new Date(m.created_at).toLocaleString(dateTimeLocale(locale))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={onSend} className="mt-4 space-y-3">
        <label className="block text-xs font-semibold text-wf-800">
          {t("buyerNewMessage", locale)}
          <textarea
            className="mt-1.5 w-full rounded-md border border-wf-400 px-3 py-2 text-sm text-wf-900"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            required
          />
        </label>
        <Button type="submit" disabled={busy || body.trim().length < 1}>
          {busy ? t("buyerSubmitting", locale) : t("commonSubmit", locale)}
        </Button>
      </form>
    </div>
  )
}
