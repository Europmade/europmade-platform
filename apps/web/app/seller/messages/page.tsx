"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { DEMO_ORDERS } from "../_lib/demo-data"
import { DEMO_ORDER_DETAILS } from "../_lib/demo-data-details"
import { useDemoMessages } from "../_lib/demo-store"

export default function SellerMessagesPage() {
  const router = useRouter()
  const [threads, setThreads] = useDemoMessages()
  const [composeOpen, setComposeOpen] = useState(false)
  const [orderId, setOrderId] = useState(DEMO_ORDERS[0]?.id ?? "")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [note, setNote] = useState<string | null>(null)
  const unread = threads.filter((t) => t.unread).length

  function sendNewMessage() {
    if (!subject.trim() || !body.trim() || !orderId) {
      setNote("Vul order, onderwerp en bericht in.")
      return
    }
    const order = DEMO_ORDER_DETAILS.find((o) => o.id === orderId)
    const id = `msg_${Date.now()}`
    setThreads((prev) => [
      {
        id,
        order_id: orderId,
        order_number: order?.order_number ?? null,
        return_id: null,
        customer_name: order?.customer.name ?? "Klant",
        customer_email: order?.customer.email ?? "",
        subject: subject.trim(),
        unread: false,
        updated_at: new Date().toISOString(),
        messages: [
          {
            id: `b_${Date.now()}`,
            sender: "seller",
            body: body.trim(),
            created_at: new Date().toISOString(),
          },
        ],
      },
      ...prev,
    ])
    setComposeOpen(false)
    setSubject("")
    setBody("")
    setNote(null)
    router.push(`/seller/messages/${id}`)
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Berichten" },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">Berichten</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Conversaties met klanten over orders en retouren.
            {unread > 0 ? ` · ${unread} ongelezen` : null}
          </p>
        </div>
        <Button type="button" onClick={() => setComposeOpen(true)}>
          Nieuw bericht
        </Button>
      </div>

      {note ? (
        <Notice variant="warning" className="mb-4">
          {note}
        </Notice>
      ) : null}

      {composeOpen ? (
        <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold text-wf-900">
            Nieuw bericht versturen
          </h2>
          <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                Gekoppelde order
              </label>
              <select
                className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              >
                {DEMO_ORDERS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} — {o.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Onderwerp"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Onderwerp van het bericht"
            />
          </div>
          <div className="mt-3">
            <Input
              label="Bericht"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Schrijf je bericht…"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={sendNewMessage}>
              Versturen
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setComposeOpen(false)
                setNote(null)
              }}
            >
              Annuleren
            </Button>
          </div>
        </section>
      ) : null}

      {threads.length === 0 ? (
        <EmptyState
          title="Geen berichten"
          description="Klantvragen over orders verschijnen hier. Je kunt ook zelf een nieuw bericht starten."
          primaryAction={{
            label: "Nieuw bericht",
            onClick: () => setComposeOpen(true),
          }}
        />
      ) : (
        <ul className="divide-y divide-wf-200 rounded-lg border border-wf-300 bg-white">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/seller/messages/${t.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs hover:bg-wf-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-wf-900">
                    {t.subject}
                    {t.unread ? (
                      <Badge variant="outline">Ongelezen</Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-wf-700">
                    {t.customer_name}
                    {t.order_number ? ` · Order #${t.order_number}` : null}
                  </div>
                  <div className="mt-0.5 truncate text-wf-600">
                    {t.messages[t.messages.length - 1]?.body}
                  </div>
                </div>
                <span className="shrink-0 text-wf-500">
                  {new Date(t.updated_at).toLocaleDateString("nl-NL")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SellerGate>
  )
}
