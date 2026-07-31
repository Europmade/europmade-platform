"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import {
  QUEUE_LABELS,
  decideModerationCase,
  getQueueItem,
  ModerationAdminApiError,
  type QueueKey,
} from "../../../../../lib/moderation-admin-api"

/**
 * Signaal beoordelen — moderatie-02 (S3-11-03).
 */
export default function ModerationDetailPage() {
  const params = useParams<{ queue: string; id: string }>()
  const router = useRouter()
  const queue = params.queue as QueueKey
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<{
    item_type: string
    title: string
    status: string
    signal_code: string | null
    affiliate_id: string | null
    subject_customer_id: string | null
    source_entity_type: string | null
    source_entity_id: string | null
    ai_note: string
    ai_metadata: {
      recommendation_type: string
      confidence_percent: number
      explanation: string | null
      label: string
    } | null
    actions: string[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    getQueueItem(queue, id)
      .then((res) => {
        if (cancelled) return
        setDetail({
          item_type: res.item.item_type,
          title: res.item.title,
          status: res.detail.status,
          signal_code: res.detail.signal_code,
          affiliate_id: res.detail.affiliate_id,
          subject_customer_id: res.detail.subject_customer_id,
          source_entity_type: res.detail.source_entity_type,
          source_entity_id: res.detail.source_entity_id,
          ai_note: res.detail.ai_note,
          ai_metadata: res.detail.ai_metadata
            ? {
                recommendation_type: res.detail.ai_metadata.recommendation_type,
                confidence_percent: res.detail.ai_metadata.confidence_percent,
                explanation: res.detail.ai_metadata.explanation,
                label: res.detail.ai_metadata.label,
              }
            : null,
          actions: res.actions,
        })
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ModerationAdminApiError
            ? err.message
            : "Detail laden mislukt."
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [queue, id])

  async function decide(decision: "geen_actie" | "escaleren") {
    setBusy(true)
    setError(null)
    try {
      await decideModerationCase(
        id,
        decision,
        reason.trim() || undefined
      )
      router.push("/moderation")
      router.refresh()
    } catch (err: unknown) {
      setError(
        err instanceof ModerationAdminApiError
          ? err.message
          : "Besluit vastleggen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-wf-600">Laden…</p>
  }

  return (
    <div>
      <nav className="mb-4 text-[11.5px] text-wf-500">
        <Link href="/moderation" className="hover:text-wf-800">
          Moderatiewachtrij
        </Link>
        {" > "}
        <b className="text-wf-800">
          {QUEUE_LABELS[queue] ?? queue}
        </b>
      </nav>

      <h1 className="text-[19px] font-bold text-wf-900">Signaal beoordelen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        AI ondersteunt met een aanbeveling, beslist nooit.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {detail ? (
        <div className="mt-6 grid gap-4 tablet:grid-cols-2">
          <div className="space-y-3 rounded-md border border-wf-300 p-4 text-xs">
            <h3 className="text-sm font-bold text-wf-900">Signaal</h3>
            <Row label="Type" value={detail.item_type} />
            <Row label="Item" value={detail.title} />
            <Row
              label="Signaalcode"
              value={detail.signal_code || "—"}
            />
            <Row label="Status" value={detail.status} />
            <div className="pt-1">
              <Badge variant="outline">{QUEUE_LABELS[queue]}</Badge>
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-dashed border-wf-500 bg-wf-100 p-4 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              AI-ondersteuning
            </p>
            {detail.ai_metadata ? (
              <>
                <div className="ai-line text-[11.5px] leading-relaxed text-wf-700">
                  <span className="font-bold text-wf-800">⚠ </span>
                  AI-advies ({detail.ai_metadata.recommendation_type}):{" "}
                  {detail.ai_metadata.explanation ?? detail.ai_note}
                </div>
                <div className="text-[11.5px] leading-relaxed text-wf-700">
                  Betrouwbaarheid: {detail.ai_metadata.confidence_percent}% —{" "}
                  {detail.ai_metadata.label}.
                </div>
              </>
            ) : (
              <p className="font-semibold text-wf-800">{detail.ai_note}</p>
            )}
            <Row
              label="Affiliate"
              value={detail.affiliate_id || "—"}
            />
            <Row
              label="Subject customer"
              value={detail.subject_customer_id || "—"}
            />
            <Row
              label="Bron"
              value={
                detail.source_entity_type
                  ? `${detail.source_entity_type}:${detail.source_entity_id ?? ""}`
                  : "—"
              }
            />
          </div>
        </div>
      ) : null}

      {detail &&
      (detail.actions.includes("geen_actie") ||
        detail.actions.includes("escaleren")) &&
      detail.status === "Gesignaleerd" ? (
        <form
          className="mt-6 max-w-lg space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
          }}
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-wf-700">
              Reden (verplicht bij escalatie; bij Geen actie optioneel — wordt
              geklokt)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Toelichting voor auditlog"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void decide("geen_actie")}
            >
              Geen actie
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void decide("escaleren")}
            >
              Escaleren
            </Button>
          </div>
        </form>
      ) : detail && detail.status !== "Gesignaleerd" ? (
        <Notice className="mt-6">
          Dit item is al besloten ({detail.status}). Open items uit andere
          wachtrijen (claims/matching) via hun bestaande product-cloud-routes.
        </Notice>
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-wf-200 py-1.5">
      <span className="text-wf-600">{label}</span>
      <span className="text-right font-medium text-wf-900">{value}</span>
    </div>
  )
}
