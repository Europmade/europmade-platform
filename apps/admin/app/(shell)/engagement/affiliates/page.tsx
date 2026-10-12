"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  listAffiliatePartners,
  type AffiliatePartner,
} from "../../../../lib/engagement-admin-api"

export default function AffiliatePartnersPage() {
  const [rows, setRows] = useState<AffiliatePartner[] | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAffiliatePartners()
      .then((partners) => {
        if (!cancelled) setRows(partners)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof EngagementAdminApiError ? err.message : "Affiliate partners laden mislukt.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = (rows ?? []).filter((row) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return `${row.organization} ${row.contact_name ?? ""} ${row.email ?? ""} ${row.partner_type_label}`
      .toLowerCase()
      .includes(q)
  })

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[19px] font-bold text-wf-900">Affiliate Partners</h1>
      <p className="mt-1 text-xs text-wf-600">
        Bestaande affiliate-accounts. Dit is geen tweede partnerdatabase.
      </p>
      <input
        className="mt-3 h-9 w-full max-w-sm rounded border border-wf-400 px-2 text-sm"
        value={query}
        placeholder="Zoek op naam of e-mail"
        onChange={(event) => setQuery(event.target.value)}
      />
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {rows === null && !error ? <p className="mt-4 text-xs text-wf-500">Laden…</p> : null}
      {rows && visible.length === 0 ? (
        <p className="mt-4 text-xs text-wf-600">Er zijn nog geen affiliate partners.</p>
      ) : null}
      <ul className="mt-3 divide-y divide-wf-200 rounded border border-wf-300 bg-white">
        {visible.map((row) => (
          <li key={row.id}>
            <Link href={`/engagement/affiliates/${row.id}`} className="grid grid-cols-2 gap-2 px-3 py-2 text-sm hover:bg-wf-50 tablet:grid-cols-4">
              <span className="font-medium text-wf-900">{row.organization}</span>
              <span className="text-wf-700">{row.contact_name || row.email || "Geen contact"}</span>
              <span className="text-wf-700">{row.partner_type_label}</span>
              <span className="text-wf-700">{row.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
