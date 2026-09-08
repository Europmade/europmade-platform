"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  deleteCmsBanner,
  listCmsBanners,
  updateCmsBanner,
  type CmsBannerDto,
} from "../../../../lib/cms-admin-api"
import { adminMarketLabel } from "../../../../lib/market-labels"

export default function CmsBannersPage() {
  const [banners, setBanners] = useState<CmsBannerDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    listCmsBanners()
      .then((res) => setBanners(res.banners))
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function togglePublish(banner: CmsBannerDto) {
    setBusy(banner.id)
    setError(null)
    try {
      await updateCmsBanner(banner.id, { published: !banner.published })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setBusy(null)
    }
  }

  async function remove(id: string) {
    if (!confirm("Banner verwijderen?")) return
    setBusy(id)
    try {
      await deleteCmsBanner(id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verwijderen mislukt")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
            <Link href="/cms" className="hover:underline">
              CMS
            </Link>{" "}
            / Banners
          </p>
          <h1 className="text-xl font-bold text-wf-950">Banners</h1>
        </div>
        <Link
          href="/cms/banners/new"
          className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
        >
          Nieuwe banner
        </Link>
      </div>

      {error ? <Notice variant="warning">{error}</Notice> : null}

      <ul className="space-y-3">
        {banners.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-wf-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-wf-900">
                  {b.title.nl || b.id}{" "}
                  <span className="text-xs font-normal text-wf-500">
                    pos {b.position} · {b.location}
                  </span>
                </p>
                <p className="mt-1 text-xs text-wf-600">
                  Markten:{" "}
                  {b.market_scope === "all"
                    ? "Alle markten"
                    : b.markets.map(adminMarketLabel).join(", ") || "—"}
                </p>
                <p className="mt-0.5 text-xs text-wf-500">
                  {b.published ? "Gepubliceerd" : "Concept"} ·{" "}
                  {b.visible ? "actief" : "inactief"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/cms/banners/${b.id}`}
                  className="inline-flex items-center justify-center rounded-wf border border-wf-500 bg-white px-[18px] py-[9px] text-sm font-semibold text-wf-800 hover:bg-wf-100"
                >
                  Bewerken
                </Link>
                <Button
                  variant="secondary"
                  disabled={busy === b.id}
                  onClick={() => togglePublish(b)}
                >
                  {b.published ? "Depubliceren" : "Publiceren"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy === b.id}
                  onClick={() => remove(b.id)}
                >
                  Verwijderen
                </Button>
              </div>
            </div>
          </li>
        ))}
        {banners.length === 0 ? (
          <li className="text-sm text-wf-600">Nog geen banners.</li>
        ) : null}
      </ul>
    </div>
  )
}
