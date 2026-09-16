"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button, Notice } from "@europmade/ui"
import {
  OrderServiceApiError,
  getStoreConversation,
  replyStoreConversation,
  type ConversationStatus,
  type MessageView,
} from "../_lib/order-service-api"
import { useStorefrontLocale } from "../_lib/i18n/use-storefront-locale"
import type { StorefrontLocale } from "../_lib/i18n/locales"
import { t, tFormat } from "../_lib/i18n/messages"

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf"

function dateTimeLocale(locale: StorefrontLocale): string {
  if (locale === "en") return "en-GB"
  if (locale === "de") return "de-DE"
  if (locale === "fr") return "fr-FR"
  return "nl-NL"
}

function AttachmentList({
  attachments,
  mine,
}: {
  attachments?: MessageView["attachments"]
  mine: boolean
}) {
  if (!attachments?.length) return null
  return (
    <ul className="mt-2 space-y-1">
      {attachments.map((a) => {
        const isImage = a.mime_type.startsWith("image/")
        const typeLabel = isImage
          ? a.mime_type.replace("image/", "").toUpperCase()
          : "PDF"
        return (
          <li key={a.id}>
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              download={a.filename}
              className={`inline-flex items-center gap-1.5 text-[11px] underline ${
                mine ? "text-wf-200" : "text-wf-700"
              }`}
            >
              <span className="rounded border border-current px-1 text-[9px] font-semibold uppercase opacity-80">
                {typeLabel}
              </span>
              {a.filename}
            </a>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.url}
                alt={a.filename}
                className="mt-1 max-h-40 max-w-full rounded border border-wf-300"
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function statusLabel(status: ConversationStatus, locale: StorefrontLocale) {
  if (status === "waiting_for_seller")
    return t("sellerMsgStatusWaitingSeller", locale)
  if (status === "waiting_for_customer")
    return t("sellerMsgStatusWaitingCustomer", locale)
  return t("sellerMsgStatusResolved", locale)
}

export function ConversationMessageThread({
  conversationId,
}: {
  conversationId: string
}) {
  const locale = useStorefrontLocale()
  const [messages, setMessages] = useState<MessageView[] | "loading">("loading")
  const [status, setStatus] = useState<ConversationStatus | null>(null)
  const [subject, setSubject] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [body, setBody] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getStoreConversation(conversationId)
      .then((res) => {
        setMessages(res.messages)
        setStatus(res.conversation.status)
        setSubject(res.conversation.subject)
        setOrderId(res.conversation.order_id)
        setOrderNumber(res.conversation.order_number)
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
  }, [conversationId, locale])

  useEffect(() => {
    load()
  }, [load])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (body.trim().length < 1) return
    setBusy(true)
    setError(null)
    try {
      await replyStoreConversation(conversationId, body.trim(), files)
      setBody("")
      setFiles([])
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
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-wf-600">
        {subject ? <span className="font-semibold text-wf-800">{subject}</span> : null}
        {status ? <span>· {statusLabel(status, locale)}</span> : null}
        {orderId && orderNumber ? (
          <Link
            href={`/account/orders/${orderId}`}
            className="font-semibold underline"
          >
            {t("commonOrder", locale)} #{orderNumber}
          </Link>
        ) : null}
      </div>

      {error ? (
        <Notice variant="warning" className="mb-3">
          {error}
        </Notice>
      ) : null}

      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border border-wf-300 bg-wf-50 p-3">
        {messages === "loading" ? (
          <p className="text-xs text-wf-600">{t("loading", locale)}</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-wf-600">{t("buyerThreadEmpty", locale)}</p>
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
                <AttachmentList attachments={m.attachments} mine={mine} />
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
        <label className="block text-xs font-semibold text-wf-800">
          {t("sellerMessagesAttachments", locale)}
          <input
            className="mt-1.5 block w-full text-xs"
            type="file"
            accept={ACCEPT}
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, 5))
            }
          />
        </label>
        {files.length > 0 ? (
          <p className="text-[11px] text-wf-600">
            {tFormat("sellerMessagesAttachmentLabel", locale, {
              name: files.map((f) => f.name).join(", "),
            })}
          </p>
        ) : null}
        <Button type="submit" disabled={busy || body.trim().length < 1}>
          {busy ? t("buyerSubmitting", locale) : t("commonSubmit", locale)}
        </Button>
      </form>
    </div>
  )
}
