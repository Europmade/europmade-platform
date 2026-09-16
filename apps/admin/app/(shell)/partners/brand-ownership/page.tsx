"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  BrandOwnershipAdminApiError,
  listBrandOwnershipClaims,
  type BrandOwnershipClaimListItem,
  type BrandPageReviewListItem,
} from "../../../../lib/brand-ownership-admin-api"

export default function BrandOwnershipQueuePage() {
  const [claims, setClaims] = useState<BrandOwnershipClaimListItem[]>([])
  const [pages, setPages] = useState<BrandPageReviewListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listBrandOwnershipClaims()
        setClaims(res.claims)
        setPages(res.pages || [])
    } catch (err) {
      setError(
        err instanceof BrandOwnershipAdminApiError
          ? err.message
          : "Overzicht laden is niet gelukt."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Sellers &gt; <b className="font-semibold text-wf-800">Merkeigenaarschap</b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">
        Review merkeigenaarschap
      </h1>
      <p className="mb-5 text-xs text-wf-600">
        Beoordeel merkeigenaarschap en ingediende merkpagina’s voordat iets
        publiek live gaat.
      </p>
      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}
      {loading ? <p className="text-sm text-wf-600">Laden…</p> : null}
      <h2 className="mb-2 mt-6 text-sm font-bold text-wf-900">
        Merkpagina’s ter beoordeling
      </h2>
      <div className="mb-6 space-y-2">
        {pages.map((row) => (
          <Link
            key={row.brand_id}
            href={`/partners/brand-ownership/pages/${row.brand_id}`}
            className="block rounded-lg border border-wf-200 bg-white px-3 py-2.5 hover:border-wf-400"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-wf-900">
                {row.brand_name}
              </p>
              <Badge variant="outline">{row.page_review_status}</Badge>
            </div>
            <p className="mt-1 text-[11px] text-wf-600">
              {row.seller_name || row.submitted_by || "Seller"}
            </p>
          </Link>
        ))}
        {!loading && pages.length === 0 ? (
          <p className="text-sm text-wf-600">Geen merkpagina’s in review.</p>
        ) : null}
      </div>
      <h2 className="mb-2 text-sm font-bold text-wf-900">Merkeigenaarschap</h2>
      <div className="space-y-2">
        {claims.map((row) => (
          <Link
            key={row.id}
            href={`/partners/brand-ownership/${row.id}`}
            className="block rounded-lg border border-wf-200 bg-white px-3 py-2.5 hover:border-wf-400"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-wf-900">
                {row.brand_name}
              </p>
              <Badge variant="outline">{row.status}</Badge>
            </div>
            <p className="mt-1 text-[11px] text-wf-600">
              {row.seller_name || row.seller_id}
            </p>
          </Link>
        ))}
        {!loading && claims.length === 0 ? (
          <p className="text-sm text-wf-600">Geen aanvragen.</p>
        ) : null}
      </div>
    </div>
  )
}
