"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  COMMUNICATION_TYPES,
  EngagementAdminApiError,
  createEngagementProgram,
  createEngagementSequence,
  listEngagementPrograms,
  listEngagementTemplates,
  type EngagementProgram,
  type EngagementTemplate,
} from "../../../../lib/engagement-admin-api"
import {
  automationStatus,
  flowSequence,
  translateAutomationError,
  typeLabel,
} from "../../../../lib/engagement-automation"

const fieldClass =
  "mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs text-wf-900"

function messageOf(err: unknown, fallback: string): string {
  const raw = err instanceof EngagementAdminApiError ? err.message : fallback
  return translateAutomationError(raw)
}

export default function EngagementAutomationsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<EngagementProgram[]>([])
  const [templates, setTemplates] = useState<EngagementTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [applied, setApplied] = useState({ q: "", type: "", status: "" })
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([listEngagementPrograms(), listEngagementTemplates()])
      .then(([programs, templateRows]) => {
        if (cancelled) return
        setRows(programs)
        setTemplates(templateRows)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(messageOf(err, "Automatiseringen laden mislukt."))
        setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSearching(false)
  }, [applied])

  function apply(next: { q: string; type: string; status: string }) {
    setSearching(true)
    setApplied(next)
  }

  const visible = rows.filter((row) => {
    const steps = flowSequence(row)?.steps ?? []
    const rowStatus = automationStatus(steps, templates)
    if (applied.q && !row.name.toLowerCase().includes(applied.q.trim().toLowerCase())) {
      return false
    }
    if (applied.type && row.program_type !== applied.type) return false
    if (applied.status && rowStatus !== applied.status) return false
    return true
  })
  const filtersActive = Boolean(applied.q || applied.type || applied.status)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[19px] font-bold text-wf-900">Automatiseringen</h1>
        <button
          type="button"
          className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white"
          onClick={() => setDialogOpen(true)}
        >
          + Nieuwe automatisering
        </button>
      </div>
      <form
        className="mt-3 grid grid-cols-2 gap-2 tablet:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault()
          apply({ q, type, status })
        }}
      >
        <label className="text-[11px] text-wf-600">
          Zoeken
          <input
            className={fieldClass}
            value={q}
            placeholder="Zoek automatisering..."
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              apply({ q: event.currentTarget.value, type, status })
            }}
          />
        </label>
        <label className="text-[11px] text-wf-600">
          Type
          <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Alle</option>
            {COMMUNICATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {typeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Status
          <select
            className={fieldClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Alle</option>
            <option value="Concept">Concept</option>
            <option value="Actief">Actief</option>
          </select>
        </label>
        <div className="col-span-2 tablet:col-span-3">
          <button
            type="submit"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white"
          >
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
        {loading ? (
          <p className="px-3 py-4 text-xs text-wf-500">Laden…</p>
        ) : searching ? (
          <p className="px-3 py-4 text-xs text-wf-500">Zoeken…</p>
        ) : visible.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-wf-700">
              {filtersActive ? "Geen automatiseringen gevonden." : "Nog geen automatiseringen."}
            </p>
            {filtersActive ? null : (
              <button
                type="button"
                className="mt-3 h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white"
                onClick={() => setDialogOpen(true)}
              >
                + Nieuwe automatisering
              </button>
            )}
          </div>
        ) : (
          visible.map((row) => {
            const steps = flowSequence(row)?.steps ?? []
            const rowStatus = automationStatus(steps, templates)
            const count = steps.length
            return (
              <Link
                key={row.id}
                href={`/engagement/automations/${row.id}`}
                className="block border-b border-wf-200 px-3 py-2.5 last:border-b-0 hover:bg-wf-50"
              >
                <div className="text-sm font-semibold text-wf-900">{row.name}</div>
                <div className="mt-0.5 text-[11px] text-wf-700">
                  {typeLabel(row.program_type)}
                  {" · "}
                  <span className="font-semibold">{rowStatus}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-wf-500">
                  {count === 1 ? "1 bericht" : `${count} berichten`}
                </div>
              </Link>
            )
          })
        )}
      </div>
      {dialogOpen ? (
        <NewAutomationDialog
          onClose={() => setDialogOpen(false)}
          onCreated={(id) => {
            setDialogOpen(false)
            router.push(`/engagement/automations/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}

function NewAutomationDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<string>(COMMUNICATION_TYPES[1])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <form
        className="w-full max-w-md rounded-lg border border-wf-300 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) {
            setError("Geef de automatisering een naam.")
            return
          }
          setSaving(true)
          setError(null)
          createEngagementProgram({ name: trimmed, program_type: type })
            .then((programs) => {
              const created = programs.find(
                (program) => program.name === trimmed && program.program_type === type
              )
              if (!created) throw new Error("Automatisering aanmaken mislukt.")
              return createEngagementSequence(created.id, trimmed).then(() => created.id)
            })
            .then((id) => onCreated(id))
            .catch((err: unknown) => {
              setError(messageOf(err, "Automatisering aanmaken mislukt."))
              setSaving(false)
            })
        }}
      >
        <h2 className="text-sm font-bold text-wf-900">Nieuwe automatisering</h2>
        <label className="mt-3 block text-[11px] text-wf-600">
          Naam
          <input
            className={fieldClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nieuwe verkoper"
          />
        </label>
        <label className="mt-3 block text-[11px] text-wf-600">
          Type
          <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
            {COMMUNICATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {typeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <div className="mt-3">
            <Notice variant="warning">{error}</Notice>
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="h-8 rounded border border-wf-300 px-3 text-[11px] text-wf-800"
            onClick={onClose}
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Automatisering maken"}
          </button>
        </div>
      </form>
    </div>
  )
}
