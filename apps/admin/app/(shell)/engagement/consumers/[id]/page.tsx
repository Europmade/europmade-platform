"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  getEngagementConsumer,
  setConsumerNewsletter,
  type EngagementConsumer,
} from "../../../../../lib/engagement-admin-api"

function longDate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(date)
}

export default function ConsumerDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [consumer, setConsumer] = useState<EngagementConsumer | null>(null)
  const [communication, setCommunication] = useState<Array<{ status: string; at: string | null }>>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getEngagementConsumer(id)
      .then((result) => {
        if (cancelled) return
        setConsumer(result.consumer)
        setCommunication(result.communication)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof EngagementAdminApiError ? err.message : "Consument laden mislukt.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function change(enabled: boolean) {
    if (!consumer) return
    setBusy(true)
    setError(null)
    try {
      const next = await setConsumerNewsletter(consumer.id, enabled)
      setConsumer(next)
      setNotice(enabled ? "Opnieuw ingeschreven." : "Uitgeschreven. De consument blijft bestaan.")
    } catch (err: unknown) {
      setError(err instanceof EngagementAdminApiError ? err.message : "Opslaan is niet gelukt.")
    } finally {
      setBusy(false)
    }
  }

  if (!consumer) {
    return error ? <Notice variant="warning">{error}</Notice> : <p className="text-xs">Laden…</p>
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/engagement/consumers" className="text-[11px] text-wf-600 hover:text-wf-900">
        ← Consumenten
      </Link>
      <h1 className="mt-2 text-[19px] font-bold text-wf-900">{consumer.name || consumer.email}</h1>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {notice ? (
        <div className="mt-3">
          <Notice variant="info">{notice}</Notice>
        </div>
      ) : null}
      <section className="mt-4 rounded-lg border border-wf-300 bg-white p-4">
        <dl className="grid grid-cols-1 gap-3 text-sm tablet:grid-cols-2">
          <div>
            <dt className="text-[11px] text-wf-500">Naam</dt>
            <dd>{consumer.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-wf-500">E-mail</dt>
            <dd>{consumer.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-wf-500">Land</dt>
            <dd>{consumer.country}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-wf-500">Taal</dt>
            <dd>{consumer.language}</dd>
          </div>
        </dl>
        <div className="mt-4 border-t border-wf-200 pt-3">
          <h2 className="text-sm font-bold text-wf-900">Nieuwsbrief</h2>
          <p className="mt-2 text-sm text-wf-900">● {consumer.newsletter}</p>
          {consumer.newsletter_enabled ? (
            <p className="mt-1 text-xs text-wf-700">Ingeschreven op: {longDate(consumer.subscribed_at)}</p>
          ) : (
            <p className="mt-1 text-xs text-wf-700">Uitgeschreven op: {longDate(consumer.unsubscribed_at)}</p>
          )}
          <p className="mt-1 text-xs text-wf-700">Bron: {consumer.source}</p>
          <div className="mt-3">
            {consumer.newsletter_enabled ? (
              <button
                type="button"
                disabled={busy}
                className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                onClick={() => void change(false)}
              >
                Uitschrijven
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                onClick={() => void change(true)}
              >
                Opnieuw inschrijven
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="mt-4 rounded-lg border border-wf-300 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">Communicatie</h2>
        {communication.length === 0 ? (
          <p className="mt-2 text-xs text-wf-600">Nog geen communicatie.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {communication.map((item, index) => (
              <li key={`${item.at}-${index}`} className="text-xs text-wf-800">
                {item.status}
                {item.at ? ` · ${longDate(item.at)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
