"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  listEngagementConsumers,
  type EngagementConsumer,
} from "../../../../lib/engagement-admin-api"
import { changedLabel } from "../../../../lib/engagement-message"

export default function ConsumersPage() {
  const [rows, setRows] = useState<EngagementConsumer[] | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listEngagementConsumers()
      .then((consumers) => {
        if (!cancelled) setRows(consumers)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof EngagementAdminApiError ? err.message : "Consumenten laden mislukt.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = (rows ?? []).filter((row) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return `${row.name} ${row.email}`.toLowerCase().includes(q)
  })

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-[19px] font-bold text-wf-900">Consumenten</h1>
      <p className="mt-1 text-xs text-wf-600">
        Eindklanten en mensen die de nieuwsbrief ontvangen. Dit zijn geen prospects.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="min-w-[220px] flex-1 text-[11px] text-wf-600">
          Zoeken
          <input
            className="mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs"
            value={query}
            placeholder="Naam of e-mail"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </form>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      <div className="mt-4 overflow-hidden rounded-lg border border-wf-300 bg-white">
        {rows === null ? (
          <p className="px-3 py-4 text-xs text-wf-600">Laden…</p>
        ) : visible.length === 0 ? (
          <p className="px-3 py-6 text-sm text-wf-700">Er zijn nog geen consumenten.</p>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_7rem_7rem_8rem_7rem_9rem] gap-2 border-b border-wf-200 bg-wf-50 px-3 py-1.5 text-[11px] font-semibold text-wf-600 desktop:grid">
              <span>Naam</span>
              <span>E-mail</span>
              <span>Land</span>
              <span>Taal</span>
              <span>Nieuwsbrief</span>
              <span>Bron</span>
              <span>Laatste wijziging</span>
            </div>
            {visible.map((row) => (
              <Link
                key={row.id}
                href={`/engagement/consumers/${row.id}`}
                className="grid grid-cols-1 gap-0.5 border-b border-wf-200 px-3 py-2 last:border-b-0 hover:bg-wf-50 desktop:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_7rem_7rem_8rem_7rem_9rem] desktop:items-center desktop:gap-2"
              >
                <span className="truncate text-sm font-semibold text-wf-900">{row.name || row.email}</span>
                <span className="truncate text-xs text-wf-700">{row.email}</span>
                <span className="truncate text-xs text-wf-700">{row.country}</span>
                <span className="truncate text-xs text-wf-700">{row.language}</span>
                <span className="text-xs font-semibold text-wf-900">{row.newsletter}</span>
                <span className="truncate text-xs text-wf-700">{row.source}</span>
                <span className="text-[11px] text-wf-500">{changedLabel(row.updated_at)}</span>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
