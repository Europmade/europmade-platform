"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import {
  OrderServiceApiError,
  createSellerConversation,
  listSellerCustomerOrders,
  listSellerCustomers,
  listSellerMessageThreads,
  type ConversationStatus,
  type MessageThreadSummary,
  type SellerCustomerOption,
  type SellerOrderOption,
} from "../../_lib/order-service-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"

type FilterKey = "action_required" | "waiting_for_customer" | "resolved" | "all"

const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf"

function statusLabel(status: ConversationStatus | undefined, locale: Parameters<typeof t>[1]) {
  if (status === "waiting_for_seller") return t("sellerMsgStatusWaitingSeller", locale)
  if (status === "waiting_for_customer") return t("sellerMsgStatusWaitingCustomer", locale)
  if (status === "resolved") return t("sellerMsgStatusResolved", locale)
  return "—"
}

export default function SellerMessagesPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>("action_required")
  const [listQuery, setListQuery] = useState("")
  const [debouncedListQuery, setDebouncedListQuery] = useState("")
  const [threads, setThreads] = useState<MessageThreadSummary[] | "loading">(
    "loading"
  )
  const [attentionCount, setAttentionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [customerQuery, setCustomerQuery] = useState("")
  const [customers, setCustomers] = useState<SellerCustomerOption[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] =
    useState<SellerCustomerOption | null>(null)
  const [orderQuery, setOrderQuery] = useState("")
  const [orders, setOrders] = useState<SellerOrderOption[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SellerOrderOption | null>(
    null
  )
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedListQuery(listQuery.trim()), 300)
    return () => clearTimeout(handle)
  }, [listQuery])

  const load = useCallback(() => {
    setError(null)
    listSellerMessageThreads(filter, debouncedListQuery || undefined)
      .then((res) => {
        setThreads(res.threads)
        setAttentionCount(res.attention_count)
      })
      .catch((err: unknown) => {
        setThreads([])
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : t("sellerMessagesLoadError", locale)
        )
      })
  }, [filter, debouncedListQuery, locale])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!composeOpen || selectedCustomer) return
    if (!customerQuery.trim()) {
      setCustomers([])
      return
    }
    setCustomersLoading(true)
    const handle = setTimeout(() => {
      listSellerCustomers(customerQuery)
        .then((res) => setCustomers(res.customers))
        .catch(() => setCustomers([]))
        .finally(() => setCustomersLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [composeOpen, customerQuery, selectedCustomer])

  useEffect(() => {
    if (!composeOpen || !selectedCustomer) {
      setOrders([])
      return
    }
    setOrdersLoading(true)
    const handle = setTimeout(() => {
      listSellerCustomerOrders(selectedCustomer.customer_id, orderQuery)
        .then((res) => setOrders(res.orders))
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [composeOpen, selectedCustomer, orderQuery])

  const filters: Array<{ key: FilterKey; label: string }> = useMemo(
    () => [
      { key: "action_required", label: t("sellerMsgFilterAction", locale) },
      {
        key: "waiting_for_customer",
        label: t("sellerMsgFilterWaitingCustomer", locale),
      },
      { key: "resolved", label: t("sellerMsgFilterResolved", locale) },
      { key: "all", label: t("sellerMsgFilterAll", locale) },
    ],
    [locale]
  )

  function resetCompose() {
    setComposeError(null)
    setCustomerQuery("")
    setCustomers([])
    setSelectedCustomer(null)
    setOrderQuery("")
    setOrders([])
    setSelectedOrder(null)
    setSubject("")
    setBody("")
    setFiles([])
  }

  async function sendNewMessage() {
    if (!selectedCustomer) {
      setComposeError(t("sellerMessagesCustomerRequired", locale))
      return
    }
    if (!subject.trim()) {
      setComposeError(t("sellerMessagesSubjectRequired", locale))
      return
    }
    if (!body.trim()) {
      setComposeError(t("sellerMessagesBodyRequired", locale))
      return
    }
    setBusy(true)
    setComposeError(null)
    setError(null)
    try {
      const result = await createSellerConversation({
        customer_id: selectedCustomer.customer_id,
        order_id: selectedOrder?.id ?? null,
        subject: subject.trim(),
        body: body.trim(),
        files,
      })
      setComposeOpen(false)
      resetCompose()
      router.push(`/seller/messages/${result.conversation_id}`)
    } catch (err: unknown) {
      setComposeError(
        err instanceof OrderServiceApiError
          ? err.message
          : t("sellerMessagesSendFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMessages", locale) },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerNavMessages", locale)}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {t("sellerMessagesIntro", locale)}
            {attentionCount > 0
              ? ` · ${tFormat("sellerMessagesAttentionCount", locale, {
                  count: attentionCount,
                })}`
              : null}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetCompose()
            setComposeOpen(true)
          }}
        >
          {t("sellerMessagesNew", locale)}
        </Button>
      </div>

      <div className="mb-3">
        <Input
          label={t("sellerMessagesSearchMessages", locale)}
          value={listQuery}
          onChange={(e) => setListQuery(e.target.value)}
          placeholder={t("sellerMessagesSearchMessagesPlaceholder", locale)}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
              filter === item.key
                ? "border-wf-900 bg-wf-900 text-white"
                : "border-wf-400 bg-white text-wf-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

      {composeOpen ? (
        <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold text-wf-900">
            {t("sellerMessagesCompose", locale)}
          </h2>

          {composeError ? (
            <Notice variant="warning" className="mb-3">
              {composeError}
            </Notice>
          ) : null}

          {selectedCustomer ? (
            <div className="mb-3 rounded-md border border-wf-200 bg-wf-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                {t("sellerMessagesSelectedCustomer", locale)}
              </div>
              <div className="mt-1 text-xs font-semibold text-wf-900">
                {selectedCustomer.name}
              </div>
              {selectedCustomer.email ? (
                <div className="text-xs text-wf-700">{selectedCustomer.email}</div>
              ) : null}
              <button
                type="button"
                className="mt-2 text-[11px] font-semibold text-wf-800 underline"
                onClick={() => {
                  setSelectedCustomer(null)
                  setSelectedOrder(null)
                  setOrderQuery("")
                  setOrders([])
                  setCustomerQuery("")
                  setCustomers([])
                }}
              >
                {t("sellerMessagesClearCustomer", locale)}
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                label={t("sellerMessagesSearchCustomer", locale)}
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder={t(
                  "sellerMessagesSearchCustomerPlaceholder",
                  locale
                )}
                autoComplete="off"
              />
              {customerQuery.trim() ? (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-wf-300 bg-white shadow-sm">
                  {customersLoading ? (
                    <li className="px-3 py-2 text-xs text-wf-600">
                      {t("loading", locale)}
                    </li>
                  ) : customers.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-wf-600">
                      {t("sellerMessagesNoCustomerResults", locale)}
                    </li>
                  ) : (
                    customers.map((c) => (
                      <li key={c.customer_id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-wf-50"
                          onClick={() => {
                            setSelectedCustomer(c)
                            setSelectedOrder(null)
                            setOrderQuery("")
                            setCustomerQuery("")
                            setCustomers([])
                            setComposeError(null)
                          }}
                        >
                          <div className="text-xs font-semibold text-wf-900">
                            {c.name}
                          </div>
                          {c.email ? (
                            <div className="text-[11px] text-wf-600">
                              {c.email}
                            </div>
                          ) : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          )}

          {selectedCustomer ? (
            <div className="relative mt-3">
              <Input
                label={t("sellerMessagesSearchOrder", locale)}
                value={
                  selectedOrder
                    ? selectedOrder.order_number
                    : orderQuery
                }
                onChange={(e) => {
                  setSelectedOrder(null)
                  setOrderQuery(e.target.value)
                }}
                placeholder={t("sellerMessagesSearchOrderPlaceholder", locale)}
                autoComplete="off"
              />
              {selectedOrder ? (
                <button
                  type="button"
                  className="mt-1 text-[11px] font-semibold text-wf-800 underline"
                  onClick={() => {
                    setSelectedOrder(null)
                    setOrderQuery("")
                  }}
                >
                  {t("sellerMessagesNoOrder", locale)}
                </button>
              ) : (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-wf-200">
                  <li>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-xs text-wf-700 hover:bg-wf-50"
                      onClick={() => {
                        setSelectedOrder(null)
                        setOrderQuery("")
                      }}
                    >
                      {t("sellerMessagesNoOrder", locale)}
                    </button>
                  </li>
                  {ordersLoading ? (
                    <li className="px-3 py-2 text-xs text-wf-600">
                      {t("loading", locale)}
                    </li>
                  ) : orders.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-wf-600">
                      {t("sellerMessagesNoOrderResults", locale)}
                    </li>
                  ) : (
                    orders.map((order) => (
                      <li key={order.id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-xs font-semibold text-wf-900 hover:bg-wf-50"
                          onClick={() => {
                            setSelectedOrder(order)
                            setOrderQuery("")
                          }}
                        >
                          {order.order_number}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          ) : null}

          <div className="mt-3">
            <Input
              label={t("commonSubject", locale)}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("sellerMessagesSubjectPlaceholder", locale)}
            />
          </div>
          <div className="mt-3">
            <Input
              label={t("commonMessage", locale)}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("sellerMessagesBodyPlaceholder", locale)}
            />
          </div>
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
                {files.map((f) => f.name).join(", ")}
              </p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={sendNewMessage} disabled={busy}>
              {t("commonSubmit", locale)}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setComposeOpen(false)
                resetCompose()
              }}
            >
              {t("commonCancel", locale)}
            </Button>
          </div>
        </section>
      ) : null}

      {threads === "loading" ? (
        <p className="text-xs text-wf-600">{t("loading", locale)}</p>
      ) : threads.length === 0 ? (
        <EmptyState
          title={t("sellerMessagesEmptyTitle", locale)}
          description={t("sellerMessagesEmptyDesc", locale)}
          primaryAction={{
            label: t("sellerMessagesNew", locale),
            onClick: () => {
              resetCompose()
              setComposeOpen(true)
            },
          }}
        />
      ) : (
        <ul className="divide-y divide-wf-200 rounded-lg border border-wf-300 bg-white">
          {threads.map((thread) => {
            const id = thread.id ?? thread.conversation_id
            if (!id) return null
            const customerLabel =
              thread.customer_name ||
              thread.customer_email ||
              thread.customer_id ||
              t("sellerMessagesCustomerFallback", locale)
            return (
              <li key={id}>
                <Link
                  href={`/seller/messages/${id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs hover:bg-wf-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-wf-900">
                      {thread.subject ||
                        thread.last_body_preview ||
                        t("sellerNavMessages", locale)}
                      {thread.unread ? (
                        <Badge variant="outline">
                          {t("commonUnread", locale)}
                        </Badge>
                      ) : null}
                      <Badge variant="outline">
                        {statusLabel(thread.status, locale)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-wf-800">{customerLabel}</div>
                    {thread.customer_email &&
                    thread.customer_name &&
                    thread.customer_email !== thread.customer_name ? (
                      <div className="text-[11px] text-wf-600">
                        {thread.customer_email}
                      </div>
                    ) : null}
                    <div className="mt-0.5 text-wf-700">
                      {thread.order_number
                        ? `${t("commonOrder", locale)} #${thread.order_number}`
                        : t("sellerMessagesNoOrderLinked", locale)}
                    </div>
                    {thread.last_body_preview ? (
                      <div className="mt-0.5 truncate text-wf-600">
                        {t("sellerMessagesLastMessage", locale)}:{" "}
                        {thread.last_body_preview}
                      </div>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-wf-500">
                    {thread.last_message_at
                      ? new Date(thread.last_message_at).toLocaleString(intl, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : null}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SellerGate>
  )
}
