"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  getEngagementEvent,
  type EngagementEvent,
} from "../../../../../lib/engagement-admin-api"
import { fillMessageTokens } from "../../../../../lib/engagement-tokens"
import { MessagePreview } from "../../templates/_components/message-preview"
import { HistoryStatus } from "../_components/status-chip"

function historyWhen(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const day = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
  const time = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
  return `${day} · ${time}`
}

function firstName(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0] || null
}

function enrollmentLabel(status: string | null): string {
  if (status === "active") return "Actief"
  if (status === "stopped") return "Gestopt"
  if (status === "completed") return "Afgerond"
  if (status === "human_follow_up") return "Opvolging door een persoon"
  if (status === "suppressed") return "Onderdrukt"
  return status || "—"
}

export default function EngagementHistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = useState<EngagementEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop")

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getEngagementEvent(id)
      .then((event) => {
        if (cancelled) return
        setRow(event)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof EngagementAdminApiError
            ? err.message
            : "Communicatie laden mislukt."
        )
        setRow(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <p className="text-xs text-wf-500">Laden…</p>
  if (!row) {
    return error ? <Notice variant="warning">{error}</Notice> : <p className="text-xs">Communicatie niet gevonden.</p>
  }

  const givenName = firstName(row.contact_name)
  const company = row.organization_name
  const email = row.contact_email
  const fill = (value: string | null) =>
    fillMessageTokens(value ?? "", {
      voornaam: givenName,
      bedrijfsnaam: company,
      email,
    })
  const hasVersion = Boolean(row.template_version_id && (row.template_version_body || row.template_version_subject))

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/engagement/history" className="text-[11px] text-wf-600 hover:text-wf-900">
        ← Communicatiehistorie
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {row.template_name || "Bericht"}
          </h1>
          {row.template_version_subject ? (
            <p className="mt-1 text-sm text-wf-800">{fill(row.template_version_subject)}</p>
          ) : null}
          <p className="mt-1 text-sm text-wf-900">
            {row.contact_name || row.contact_email || "Onbekend contact"}
          </p>
          <p className="text-xs text-wf-700">{row.organization_name || "Geen bedrijf"}</p>
          <p className="mt-1 text-[11px] text-wf-500">{historyWhen(row.created_at)}</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-wf-500">Status</div>
          <div className="mt-1">
            <HistoryStatus status={row.status} />
          </div>
        </div>
      </div>
      {row.status === "queued" ? (
        <p className="mt-3 rounded border border-wf-300 bg-wf-50 px-3 py-2 text-xs text-wf-800">
          Dit bericht staat klaar. Er is niets verzonden.
        </p>
      ) : null}
      {row.delivery_error ? (
        <p className="mt-3 rounded border border-wf-300 bg-wf-50 px-3 py-2 text-xs text-wf-800">
          {row.delivery_error}
        </p>
      ) : null}
      {hasVersion ? (
        <div className="mt-4">
          <div className="mb-2 flex justify-end gap-1">
            <button
              type="button"
              className={`h-7 rounded px-2 text-[11px] font-medium ${
                mode === "desktop" ? "bg-wf-900 text-white" : "border border-wf-300 bg-white"
              }`}
              onClick={() => setMode("desktop")}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`h-7 rounded px-2 text-[11px] font-medium ${
                mode === "mobile" ? "bg-wf-900 text-white" : "border border-wf-300 bg-white"
              }`}
              onClick={() => setMode("mobile")}
            >
              Mobiel
            </button>
          </div>
          <MessagePreview
            subject={fill(row.template_version_subject)}
            preheader={fill(row.template_version_preheader)}
            body={fill(row.template_version_body)}
            ctaLabel={row.template_version_cta_label ?? ""}
            ctaUrl={row.template_version_cta_url ?? ""}
            mode={mode}
            recipientName={row.contact_name || "Maria"}
            recipientCompany={company || ""}
          />
          <p className="mt-2 text-[11px] text-wf-500">
            Personalisatie gebruikt de huidige contactgegevens waar die bekend zijn. Ontbrekende waarden blijven voorbeeldtekst. Dit is geen vastgelegde kopie van een verzending.
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded border border-wf-300 bg-wf-50 px-3 py-2 text-xs text-wf-700">
          De tekst van de gebruikte versie is niet vastgelegd.
        </p>
      )}
      <details className="mt-6 rounded-lg border border-wf-300 bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-wf-700">
          Meer over deze stap
        </summary>
        <dl className="mt-2 space-y-1 text-[11px] text-wf-700">
          <div>Versie {row.template_version_number || "—"}</div>
          <div>Taal: {row.locale || "—"}</div>
          <div>Automatisering: {row.program_name || "—"}</div>
          <div>Stand: {enrollmentLabel(row.enrollment_status)}</div>
        </dl>
      </details>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
    </div>
  )
}
