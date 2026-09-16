"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { OrderFulfilmentSummary } from "../../_components/order-fulfil-summary"
import {
  OrderServiceApiError,
  getSellerConversation,
  patchSellerConversationStatus,
  replySellerConversation,
  type ConversationStatus,
  type MessageView,
  type SellerOrderBundle,
} from "../../../_lib/order-service-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, tFormat } from "../../../_lib/i18n/messages"

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf"

function conversationStatusLabel(
  status: ConversationStatus,
  locale: Parameters<typeof t>[1]
) {
  if (status === "waiting_for_seller")
    return t("sellerMsgStatusWaitingSeller", locale)
  if (status === "waiting_for_customer")
    return t("sellerMsgStatusWaitingCustomer", locale)
  return t("sellerMsgStatusResolved", locale)
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

export default function SellerMessageThreadPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const params = useParams<{ orderId: string }>()
  const conversationId = params.orderId
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [status, setStatus] = useState<ConversationStatus | null>(null)
  const [subject, setSubject] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderSummary, setOrderSummary] = useState<SellerOrderBundle | null>(
    null
  )
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageView[]>([])
  const [reply, setReply] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!conversationId) return
    setLoading(true)
    setError(null)
    getSellerConversation(conversationId)
      .then((res) => {
        setStatus(res.conversation.status)
        setSubject(res.conversation.subject)
        setCustomerName(
          res.conversation.customer_name ||
            res.conversation.customer_email ||
            res.conversation.customer_id
        )
        setCustomerEmail(res.conversation.customer_email || "")
        setOrderId(res.conversation.order_id)
        setOrderNumber(res.conversation.order_number)
        setOrderSummary(res.order_summary)
        setViewerId(res.viewer_customer_id)
        setMessages(res.messages)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("sellerMessagesNotFoundDesc", locale)
        )
        setMessages([])
        setOrderSummary(null)
      })
      .finally(() => setLoading(false))
  }, [conversationId, locale])

  useEffect(() => {
    load()
  }, [load])

  async function sendReply() {
    if (!conversationId || !reply.trim()) return
    setBusy(true)
    setError(null)
    try {
      await replySellerConversation(conversationId, reply.trim(), files)
      setReply("")
      setFiles([])
      setNote(t("sellerMessagesSent", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerMessagesSendFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function setConversationStatus(next: ConversationStatus) {
    if (!conversationId) return
    setBusy(true)
    try {
      await patchSellerConversationStatus(conversationId, next)
      setStatus(next)
      setNote(t("sellerMessagesStatusUpdated", locale))
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerMessagesSendFailed", locale)
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
          { label: t("sellerNavMessages", locale), href: "/seller/messages" },
        ]}
      >
        <p className="text-xs text-wf-600">{t("loading", locale)}</p>
      </SellerGate>
    )
  }

  if (error && messages.length === 0) {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavMessages", locale), href: "/seller/messages" },
          { label: t("commonUnknown", locale) },
        ]}
      >
        <EmptyState
          title={t("sellerMessagesNotFoundTitle", locale)}
          description={error}
          primaryAction={{
            label: t("commonBack", locale),
            href: "/seller/messages",
          }}
        />
      </SellerGate>
    )
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMessages", locale), href: "/seller/messages" },
        { label: subject || t("sellerNavMessages", locale) },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {subject || t("sellerNavMessages", locale)}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {customerName}
            {customerEmail ? ` · ${customerEmail}` : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {orderId && orderNumber ? (
            <Link
              href={`/seller/orders/${orderId}`}
              className="rounded-md border border-wf-400 px-3 py-1.5 font-semibold text-wf-800"
            >
              {t("commonOrder", locale)} #{orderNumber}
            </Link>
          ) : null}
          {status ? (
            <Badge variant="outline">
              {conversationStatusLabel(status, locale)}
            </Badge>
          ) : null}
        </div>
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

      {orderSummary ? (
        <div className="mb-5">
          <OrderFulfilmentSummary
            bundle={orderSummary}
            locale={locale}
            compact
          />
        </div>
      ) : null}

      <section className="mb-5 space-y-3 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerMessagesConversation", locale)}
        </h2>
        {messages.map((m) => {
          const mine = viewerId != null && m.sender_customer_id === viewerId
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-md px-3 py-2 text-xs ${
                mine
                  ? "ml-auto bg-wf-900 text-white"
                  : "bg-wf-100 text-wf-800"
              }`}
            >
              <div className="mb-1 text-[10px] opacity-80">
                {mine ? t("commonYou", locale) : customerName} ·{" "}
                {new Date(m.created_at).toLocaleString(intl)}
              </div>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <AttachmentList attachments={m.attachments} mine={mine} />
            </div>
          )
        })}
      </section>

      <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {status !== "resolved" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setConversationStatus("resolved")}
            >
              {t("sellerMessagesMarkResolved", locale)}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setConversationStatus("waiting_for_seller")}
            >
              {t("sellerMessagesReopen", locale)}
            </Button>
          )}
        </div>
        <Input
          label={t("commonReply", locale)}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("sellerMessagesReplyPlaceholder", locale)}
        />
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
            {t("sellerMessagesAttachments", locale)}
          </label>
          <input
            type="file"
            accept={ACCEPT}
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, 5))
            }
          />
          {files.length > 0 ? (
            <p className="mt-1 text-[11px] text-wf-600">
              {tFormat("sellerMessagesAttachmentLabel", locale, {
                name: files.map((f) => f.name).join(", "),
              })}
            </p>
          ) : null}
        </div>
        <div className="mt-3">
          <Button
            type="button"
            onClick={sendReply}
            disabled={busy || !reply.trim()}
          >
            {t("commonSubmit", locale)}
          </Button>
        </div>
      </section>
    </SellerGate>
  )
}
