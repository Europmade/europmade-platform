"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import {
  OrderAdminApiError,
  getAdminOrder,
  listAdminOrderMessages,
  resolveOrderException,
} from "../../../../lib/order-admin-api"

export default function OrderManagementDetailPage() {
  const params = useParams<{ id: string }>()
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getAdminOrder>
  > | null>(null)
  const [messages, setMessages] = useState<
    Awaited<ReturnType<typeof listAdminOrderMessages>>["messages"] | null
  >(null)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAdminOrder(params.id)
      .then((res) => {
        if (!cancelled) setDetail(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderAdminApiError
            ? err.message
            : "Order laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  useEffect(() => {
    if (!detail) return
    const escalated = detail.returns.some((r) => r.status === "Geëscaleerd")
    if (!escalated) {
      setMessages(null)
      return
    }
    listAdminOrderMessages(params.id)
      .then((res) => setMessages(res.messages))
      .catch((err: unknown) => {
        setMsgError(
          err instanceof OrderAdminApiError
            ? err.message
            : "Berichten laden mislukt."
        )
      })
  }, [detail, params.id])

  async function onResolve() {
    setBusy(true)
    setError(null)
    try {
      await resolveOrderException(params.id, reason)
      setReason("")
      const res = await getAdminOrder(params.id)
      setDetail(res)
    } catch (err: unknown) {
      setError(
        err instanceof OrderAdminApiError
          ? err.message
          : "Afhandelen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (!detail && !error) {
    return <p className="text-xs text-wf-600">Laden…</p>
  }

  return (
    <div>
      <Link href="/orders" className="text-xs font-semibold underline">
        ← Terug naar overzicht
      </Link>
      <h1 className="mt-3 text-[19px] font-bold text-wf-900">
        Order #{detail?.order.order_number ?? params.id}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Read-only detail. Geen retour-/klantenserviceacties in OMC.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {detail ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{detail.order.payment_status}</Badge>
            {detail.order.exception_status ? (
              <Badge variant="solid">{detail.order.exception_status}</Badge>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 tablet:grid-cols-2">
            <div className="rounded-md border border-wf-300 p-3 text-xs">
              <div className="font-semibold">Verzendadres</div>
              <p className="mt-1 whitespace-pre-wrap text-wf-700">
                {detail.order.shipping_address}
              </p>
            </div>
            <div className="rounded-md border border-wf-300 p-3 text-xs">
              <div className="font-semibold">Factuuradres</div>
              <p className="mt-1 whitespace-pre-wrap text-wf-700">
                {detail.order.billing_address}
              </p>
            </div>
          </div>

          <h2 className="mt-6 text-sm font-bold">Regels</h2>
          <ul className="mt-2 divide-y divide-wf-200 rounded-md border border-wf-300 text-xs">
            {detail.lines.map((line) => (
              <li key={line.id} className="px-3 py-2">
                {line.offer_id} · qty {line.quantity}
              </li>
            ))}
          </ul>

          {detail.order.exception_status === "Mislukte ordersplitsing" ? (
            <div className="mt-6 max-w-lg rounded-md border border-wf-400 p-4">
              <h2 className="text-sm font-bold">Uitzondering afhandelen</h2>
              <p className="mt-1 text-xs text-wf-600">
                Enige write-scope in OMC (Checkout edge case).
              </p>
              <div className="mt-3">
                <Input
                  label="Reden"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={busy || reason.trim().length < 3}
                onClick={onResolve}
              >
                Markeer als Afgehandeld
              </Button>
            </div>
          ) : null}

          {msgError ? (
            <Notice variant="warning" className="mt-4">
              {msgError}
            </Notice>
          ) : null}

          {messages ? (
            <div className="mt-6">
              <h2 className="text-sm font-bold">
                Meegelezen berichten (geëscaleerd geschil)
              </h2>
              <ul className="mt-2 space-y-2 rounded-md border border-wf-300 bg-wf-50 p-3 text-xs">
                {messages.length === 0 ? (
                  <li className="text-wf-600">Geen berichten.</li>
                ) : (
                  messages.map((m) => (
                    <li
                      key={m.id}
                      className="rounded border border-wf-200 bg-white px-2 py-1.5"
                    >
                      <div className="text-wf-500">
                        {m.sender_customer_id.slice(0, 12)}… ·{" "}
                        {new Date(m.created_at).toLocaleString("nl-NL")}
                      </div>
                      <div className="mt-0.5 whitespace-pre-wrap text-wf-800">
                        {m.body}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
