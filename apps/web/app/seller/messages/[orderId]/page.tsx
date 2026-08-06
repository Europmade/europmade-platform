"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { useDemoMessages } from "../../_lib/demo-store"

export default function SellerMessageThreadPage() {
  const params = useParams<{ orderId: string }>()
  const [threads, setThreads] = useDemoMessages()
  const thread = useMemo(
    () => threads.find((t) => t.id === params.orderId),
    [threads, params.orderId]
  )
  const [reply, setReply] = useState("")
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!thread?.unread) return
    const id = thread.id
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: false } : t))
    )
  }, [thread?.id, thread?.unread, setThreads])

  if (!thread) {
    return (
      <SellerGate
        breadcrumb={[
          { label: "Seller Dashboard", href: "/seller" },
          { label: "Berichten", href: "/seller/messages" },
          { label: "Onbekend" },
        ]}
      >
        <EmptyState
          title="Bericht niet gevonden"
          description="Deze conversatie bestaat niet."
          primaryAction={{ label: "Terug", href: "/seller/messages" }}
        />
      </SellerGate>
    )
  }

  function sendReply() {
    if (!reply.trim()) return
    const body = reply.trim()
    const id = thread.id
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        return {
          ...t,
          unread: false,
          updated_at: new Date().toISOString(),
          messages: [
            ...t.messages,
            {
              id: `b_${Date.now()}`,
              sender: "seller" as const,
              body,
              created_at: new Date().toISOString(),
            },
          ],
        }
      })
    )
    setReply("")
    setNote("Bericht verzonden.")
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Berichten", href: "/seller/messages" },
        { label: thread.subject },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">{thread.subject}</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {thread.customer_name} · {thread.customer_email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {thread.order_id ? (
            <Link
              href={`/seller/orders/${thread.order_id}`}
              className="rounded-md border border-wf-400 px-3 py-1.5 font-semibold text-wf-800"
            >
              Order #{thread.order_number}
            </Link>
          ) : null}
          {thread.return_id ? (
            <Link
              href={`/seller/returns/${thread.return_id}`}
              className="rounded-md border border-wf-400 px-3 py-1.5 font-semibold text-wf-800"
            >
              Retour {thread.return_id}
            </Link>
          ) : null}
          <Badge variant="outline">Gelezen</Badge>
        </div>
      </div>

      {note ? (
        <Notice variant="info" className="mb-4">
          {note}
        </Notice>
      ) : null}

      <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Klantinformatie
        </h2>
        <dl className="grid gap-2 text-xs tablet:grid-cols-2">
          <div>
            <dt className="text-wf-500">Naam</dt>
            <dd className="text-wf-800">{thread.customer_name}</dd>
          </div>
          <div>
            <dt className="text-wf-500">E-mail</dt>
            <dd className="text-wf-800">{thread.customer_email}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-5 space-y-3 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Conversatie
        </h2>
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-md px-3 py-2 text-xs ${
              m.sender === "seller"
                ? "ml-auto bg-wf-900 text-white"
                : "bg-wf-100 text-wf-800"
            }`}
          >
            <div className="mb-1 text-[10px] opacity-80">
              {m.sender === "seller" ? "Jij" : thread.customer_name} ·{" "}
              {new Date(m.created_at).toLocaleString("nl-NL")}
            </div>
            <p>{m.body}</p>
            {m.attachment_name ? (
              <p className="mt-1 underline opacity-90">
                Bijlage: {m.attachment_name}
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
        <Input
          label="Antwoord"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Schrijf een bericht…"
        />
        <div className="mt-3">
          <Button type="button" onClick={sendReply} disabled={!reply.trim()}>
            Versturen
          </Button>
        </div>
      </section>
    </SellerGate>
  )
}
