"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import {
  COMMUNICATION_EVENT_STATUSES,
  EngagementAdminApiError,
  eventStatusLabel,
  listEngagementEvents,
  listEngagementTemplates,
  type EngagementEventFilters,
  type EngagementTemplate,
} from "../../../../lib/engagement-admin-api"
import { HistoryStatus } from "./_components/status-chip"

const fieldClass =
  "mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs text-wf-900"

function messageOf(err: unknown, fallback: string): string {
  return err instanceof EngagementAdminApiError ? err.message : fallback
}

function ymd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function periodRange(
  period: string,
  customFrom: string,
  customTo: string
): { from?: string; to?: string } {
  const today = new Date()
  if (period === "today") return { from: ymd(today), to: ymd(today) }
  if (period === "week") {
    const start = new Date(today)
    const day = start.getDay()
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
    return { from: ymd(start), to: ymd(today) }
  }
  if (period === "month") {
    return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) }
  }
  if (period === "custom") {
    return { from: customFrom || undefined, to: customTo || undefined }
  }
  return {}
}

function historyWhen(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const day = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
  const time = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
  return `${day} · ${time}`
}

export default function EngagementHistoryPage() {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [period, setPeriod] = useState("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [templates, setTemplates] = useState<EngagementTemplate[]>([])
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listEngagementEvents>>["events"]
  >([])
  const [phase, setPhase] = useState<"load" | "search" | "ready">("load")
  const [error, setError] = useState<string | null>(null)
  const [filtered, setFiltered] = useState(false)

  const load = useCallback((filters: EngagementEventFilters, searching: boolean) => {
    setPhase(searching ? "search" : "load")
    if (searching) setRows([])
    return listEngagementEvents(filters)
      .then((result) => {
        setRows(result.events)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(messageOf(err, "Communicatiehistorie laden mislukt."))
        setRows([])
      })
      .finally(() => setPhase("ready"))
  }, [])

  useEffect(() => {
    listEngagementTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
    load({}, false)
  }, [load])

  function currentFilters(
    overrides: Partial<{
      q: string
      status: string
      templateId: string
      period: string
      customFrom: string
      customTo: string
    }> = {}
  ): EngagementEventFilters {
    const nextPeriod = overrides.period ?? period
    const range = periodRange(
      nextPeriod,
      overrides.customFrom ?? customFrom,
      overrides.customTo ?? customTo
    )
    const search = overrides.q ?? q
    const nextStatus = overrides.status ?? status
    const nextTemplate = overrides.templateId ?? templateId
    return {
      q: search.trim() || undefined,
      status: nextStatus || undefined,
      template_id: nextTemplate || undefined,
      from: range.from,
      to: range.to,
    }
  }

  function apply(
    overrides: Parameters<typeof currentFilters>[0] = {},
    searching = true
  ) {
    const next = currentFilters(overrides)
    setFiltered(Boolean(next.q || next.status || next.template_id || next.from || next.to))
    load(next, searching)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[19px] font-bold text-wf-900">Communicatiehistorie</h1>
      <form
        className="mt-3 grid grid-cols-2 gap-2 tablet:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          apply()
        }}
      >
        <label className="col-span-2 text-[11px] text-wf-600 tablet:col-span-4">
          Zoeken
          <input
            className={fieldClass}
            value={q}
            placeholder="Zoek op contact, bedrijf of bericht..."
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              apply({ q: event.currentTarget.value })
            }}
          />
        </label>
        <label className="text-[11px] text-wf-600">
          Bericht
          <select
            className={fieldClass}
            value={templateId}
            onChange={(event) => {
              setTemplateId(event.target.value)
              apply({ templateId: event.target.value })
            }}
          >
            <option value="">Alle</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Status
          <select
            className={fieldClass}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              apply({ status: event.target.value })
            }}
          >
            <option value="">Alle</option>
            {COMMUNICATION_EVENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {eventStatusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Periode
          <select
            className={fieldClass}
            value={period}
            onChange={(event) => {
              const next = event.target.value
              setPeriod(next)
              if (next !== "custom") apply({ period: next })
            }}
          >
            <option value="all">Alle</option>
            <option value="today">Vandaag</option>
            <option value="week">Deze week</option>
            <option value="month">Deze maand</option>
            <option value="custom">Aangepaste periode</option>
          </select>
        </label>
        {period === "custom" ? (
          <>
            <label className="text-[11px] text-wf-600">
              Vanaf
              <input
                className={fieldClass}
                type="date"
                value={customFrom}
                onChange={(event) => {
                  setCustomFrom(event.target.value)
                  apply({ period: "custom", customFrom: event.target.value })
                }}
              />
            </label>
            <label className="text-[11px] text-wf-600">
              Tot en met
              <input
                className={fieldClass}
                type="date"
                value={customTo}
                onChange={(event) => {
                  setCustomTo(event.target.value)
                  apply({ period: "custom", customTo: event.target.value })
                }}
              />
            </label>
          </>
        ) : null}
        <div className="col-span-2 flex items-end tablet:col-span-4">
          <button type="submit" className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white">
            Filteren
          </button>
        </div>
      </form>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      <div className="mt-3 overflow-hidden rounded-lg border border-wf-300 bg-white">
        <div className="hidden border-b border-wf-200 bg-wf-50 px-3 py-1.5 text-[11px] font-semibold text-wf-600 desktop:grid desktop:grid-cols-[8.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_6.75rem_6.75rem] desktop:gap-2">
          <span>Datum</span>
          <span>Contact</span>
          <span>Bedrijf</span>
          <span>Bericht</span>
          <span>Status</span>
          <span>Actie</span>
        </div>
        {phase !== "ready" ? (
          <p className="px-3 py-4 text-xs text-wf-500">{phase === "search" ? "Zoeken…" : "Laden…"}</p>
        ) : rows.length === 0 ? (
          <div className="px-3 py-6">
            <p className="text-sm text-wf-800">
              {filtered ? "Geen communicatie gevonden." : "Nog geen communicatie"}
            </p>
            {filtered ? null : (
              <p className="mt-1 text-xs text-wf-600">
                Zodra berichten automatisch of handmatig zijn verwerkt, verschijnt hier de geschiedenis.
              </p>
            )}
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-1 border-b border-wf-200 px-3 py-2.5 last:border-b-0 desktop:grid-cols-[8.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_6.75rem_6.75rem] desktop:items-center desktop:gap-2"
            >
              <div className="text-[11px] text-wf-500">{historyWhen(row.created_at)}</div>
              <div className="truncate text-sm font-semibold text-wf-900">
                {row.contact_name || row.contact_email || "Onbekend contact"}
              </div>
              <div className="truncate text-xs text-wf-700">{row.organization_name || "Geen bedrijf"}</div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-wf-900">
                  {row.template_name || "Bericht"}
                </div>
                {row.template_version_subject ? (
                  <div className="truncate text-[11px] text-wf-600">
                    {row.template_version_subject}
                  </div>
                ) : null}
              </div>
              <div>
                <HistoryStatus status={row.status} />
                {row.delivery_error ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-wf-600">{row.delivery_error}</p>
                ) : null}
              </div>
              <Link
                href={`/engagement/history/${row.id}`}
                className="text-[11px] font-medium text-wf-900 underline"
              >
                Bericht bekijken
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
