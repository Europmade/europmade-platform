"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  EuropeanOwnershipAdminApiError,
  listEuropeanOwnershipClaims,
  type EuropeanOwnershipClaimRow,
} from "../../../../lib/european-ownership-admin-api"

const TABS = [
  "all",
  "Opgegeven door aanbieder",
  "Bewijs aangeleverd",
  "Bewijs opgevraagd",
  "Geverifieerd door EuropMade",
  "Afgewezen",
] as const

export default function EuropeanOwnershipQueuePage() {
  const [rows, setRows] = useState<EuropeanOwnershipClaimRow[] | "loading">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]>("Bewijs aangeleverd")

  async function load() {
    setError(null)
    setRows("loading")
    try {
      const res = await listEuropeanOwnershipClaims(tab === "all" ? "all" : tab)
      setRows(res.claims)
    } catch (err) {
      setError(
        err instanceof EuropeanOwnershipAdminApiError
          ? err.message
          : "Claims laden mislukt."
      )
      setRows([])
    }
  }

  useEffect(() => {
    void load()
  }, [tab])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Europese eigendom</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Beoordeel claims over Europees eigendom van producenten. Dit staat los
        van Made in Europe / productielocatie.
      </p>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded px-2 py-1 text-[11px] font-semibold ${
              tab === item ? "bg-wf-900 text-white" : "bg-wf-100 text-wf-700"
            }`}
          >
            {item === "all" ? "Alles" : item}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {rows === "loading" ? (
          <p className="text-xs text-wf-500">Laden…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-wf-600">Geen claims in deze filter.</p>
        ) : (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded border border-wf-300 bg-white p-3 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-wf-900">
                    {row.ownership_band_label} · {row.source_label}
                  </p>
                  <p className="mt-1 text-wf-600">
                    Manufacturer: {row.manufacturer_id}
                  </p>
                  <p className="mt-1">
                    <Badge variant="outline">{row.status}</Badge>
                  </p>
                </div>
                <Link
                  href={`/product-cloud/european-ownership/${row.id}`}
                  className="text-[11px] font-semibold underline"
                >
                  Beoordelen
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
