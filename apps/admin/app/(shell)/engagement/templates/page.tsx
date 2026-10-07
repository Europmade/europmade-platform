"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  COMMUNICATION_TYPES,
  EngagementAdminApiError,
  createEngagementTemplate,
  createEngagementVariant,
  createEngagementVersion,
  listEngagementTemplates,
  type EngagementTemplate,
} from "../../../../lib/engagement-admin-api"
import {
  MESSAGE_LOCALES,
  MESSAGE_STATUSES,
  changedLabel,
  headlineVersion,
  displayMessageStatus,
  localeLabel,
  messageTypeLabel,
  primaryVariant,
  translateMessageError,
} from "../../../../lib/engagement-message"

const fieldClass =
  "mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs text-wf-900"

function messageOf(err: unknown, fallback: string): string {
  const raw = err instanceof EngagementAdminApiError ? err.message : fallback
  return translateMessageError(raw)
}

function statusClass(status: string): string {
  if (status === "Actief") return "text-wf-900"
  if (status === "Afgekeurd") return "text-wf-700"
  return "text-wf-800"
}

export default function EngagementTemplatesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<EngagementTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [locale, setLocale] = useState("")
  const [applied, setApplied] = useState({ q: "", type: "", status: "", locale: "" })
  const [dialogOpen, setDialogOpen] = useState(false)

  function load() {
    setLoading(true)
    return listEngagementTemplates()
      .then((templates) => {
        setRows(templates)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(messageOf(err, "Berichten laden mislukt."))
        setRows([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    listEngagementTemplates()
      .then((templates) => {
        if (cancelled) return
        setRows(templates)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(messageOf(err, "Berichten laden mislukt."))
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

  function apply(next: { q: string; type: string; status: string; locale: string }) {
    setSearching(true)
    setApplied(next)
  }

  const visible = rows
    .filter((row) => {
      const version = headlineVersion(row)
      const variant = primaryVariant(row)
      const rowStatus = version ? displayMessageStatus(row, version) : "Concept"
      const rowLocale = variant?.locale.toLowerCase() ?? ""
      if (applied.q && !row.name.toLowerCase().includes(applied.q.trim().toLowerCase())) {
        return false
      }
      if (applied.type && row.communication_type !== applied.type) return false
      if (applied.status && rowStatus !== applied.status) return false
      if (applied.locale && rowLocale !== applied.locale) return false
      return true
    })
    .sort((a, b) => {
      const aDate = headlineVersion(a)?.updated_at ?? headlineVersion(a)?.created_at ?? a.created_at ?? ""
      const bDate = headlineVersion(b)?.updated_at ?? headlineVersion(b)?.created_at ?? b.created_at ?? ""
      return bDate.localeCompare(aDate)
    })

  const filtersActive = Boolean(applied.q || applied.type || applied.status || applied.locale)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[19px] font-bold text-wf-900">Berichten</h1>
        <button
          type="button"
          className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white"
          onClick={() => setDialogOpen(true)}
        >
          + Nieuw bericht
        </button>
      </div>
      <form
        className="mt-3 grid grid-cols-2 gap-2 tablet:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          apply({ q, type, status, locale })
        }}
      >
        <label className="text-[11px] text-wf-600">
          Zoeken
          <input
            className={fieldClass}
            value={q}
            placeholder="Zoek bericht..."
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              apply({ q: event.currentTarget.value, type, status, locale })
            }}
          />
        </label>
        <label className="text-[11px] text-wf-600">
          Type
          <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Alle</option>
            {COMMUNICATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {messageTypeLabel(item)}
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
            {MESSAGE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Taal
          <select
            className={fieldClass}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            <option value="">Alle</option>
            {MESSAGE_LOCALES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex items-end tablet:col-span-4">
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
              {filtersActive ? "Geen berichten gevonden." : "Nog geen berichten."}
            </p>
            {filtersActive ? null : (
              <button
                type="button"
                className="mt-3 h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white"
                onClick={() => setDialogOpen(true)}
              >
                + Nieuw bericht
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.6fr)_8rem_8rem_8rem_9rem] gap-2 border-b border-wf-200 bg-wf-50 px-3 py-1.5 text-[11px] font-semibold text-wf-600 desktop:grid">
              <span>Bericht</span>
              <span>Type</span>
              <span>Taal</span>
              <span>Status</span>
              <span>Laatst gewijzigd</span>
            </div>
            {visible.map((row) => {
              const version = headlineVersion(row)
              const variant = primaryVariant(row)
              const rowStatus = version ? displayMessageStatus(row, version) : "Concept"
              const when = version?.updated_at ?? version?.created_at ?? row.created_at
              return (
                <Link
                  key={row.id}
                  href={`/engagement/templates/${row.id}`}
                  className="grid grid-cols-1 gap-0.5 border-b border-wf-200 px-3 py-2 last:border-b-0 hover:bg-wf-50 desktop:grid-cols-[minmax(0,1.6fr)_8rem_8rem_8rem_9rem] desktop:items-center desktop:gap-2"
                >
                  <span className="truncate text-sm font-semibold text-wf-900">{row.name}</span>
                  <span className="truncate text-xs text-wf-700">
                    {messageTypeLabel(row.communication_type)}
                  </span>
                  <span className="truncate text-xs text-wf-700">
                    {variant ? localeLabel(variant.locale) : "—"}
                  </span>
                  <span className={`text-xs font-semibold ${statusClass(rowStatus)}`}>{rowStatus}</span>
                  <span className="text-[11px] text-wf-500">{changedLabel(when)}</span>
                </Link>
              )
            })}
          </>
        )}
      </div>
      {dialogOpen ? (
        <NewMessageDialog
          onClose={() => setDialogOpen(false)}
          onCreated={(id) => {
            setDialogOpen(false)
            router.push(`/engagement/templates/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}

function NewMessageDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<string>(COMMUNICATION_TYPES[0])
  const [locale, setLocale] = useState("nl")
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
            setError("Geef het bericht een naam.")
            return
          }
          setSaving(true)
          setError(null)
          createEngagementTemplate({ name: trimmed, communication_type: type })
            .then((template) =>
              createEngagementVariant(template.id, { name: locale, locale }).then(
                (withVariant) => ({ templateId: template.id, withVariant })
              )
            )
            .then(({ templateId, withVariant }) => {
              const variant = withVariant.variants.find(
                (item) => item.locale.toLowerCase() === locale
              )
              if (!variant) throw new Error("De taal kon niet worden bewaard.")
              return createEngagementVersion(templateId, variant.id, {
                subject: trimmed,
                preheader: "Een bericht van EuropMade",
                body: "<p>Hallo {{voornaam}},</p><p>Welkom bij EuropMade.</p>",
                cta_label: "Bekijk EuropMade",
                cta_url: "https://europmade.eu",
                personalization_tokens: ["voornaam"],
              }).then(() => templateId)
            })
            .then((templateId) => onCreated(templateId))
            .catch((err: unknown) => {
              setError(messageOf(err, "Bericht aanmaken mislukt."))
              setSaving(false)
            })
        }}
      >
        <h2 className="text-sm font-bold text-wf-900">Nieuw bericht</h2>
        <label className="mt-3 block text-[11px] text-wf-600">
          Naam
          <input
            className={fieldClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Eerste kennismaking"
          />
        </label>
        <label className="mt-3 block text-[11px] text-wf-600">
          Type
          <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
            {COMMUNICATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {messageTypeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-[11px] text-wf-600">
          Taal
          <select
            className={fieldClass}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            {MESSAGE_LOCALES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
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
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Opslaan…" : "Bericht maken"}
          </button>
        </div>
      </form>
    </div>
  )
}
