"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import {
  BrandOwnershipAdminApiError,
  decideBrandPageReview,
  getBrandPageReview,
} from "../../../../../lib/brand-ownership-admin-api"

export default function BrandPageReviewDetailPage() {
  const { brandId } = useParams<{ brandId: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [targetBrandId, setTargetBrandId] = useState("")
  const [data, setData] = useState<{
    brand: Record<string, unknown>
    draft: Record<string, unknown>
    page_review_status: string
    page_review_note: string | null
    submitted_by: string | null
  } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const row = await getBrandPageReview(brandId)
        setData(row)
      } catch (err) {
        setError(
          err instanceof BrandOwnershipAdminApiError
            ? err.message
            : "Laden mislukt."
        )
      }
    })()
  }, [brandId])

  async function decide(
    action: "approve" | "reject" | "request_info" | "merge"
  ) {
    setBusy(true)
    setError(null)
    try {
      await decideBrandPageReview(brandId, {
        action,
        note,
        target_brand_id: action === "merge" ? targetBrandId.trim() : undefined,
      })
      router.push("/partners/brand-ownership")
    } catch (err) {
      setError(
        err instanceof BrandOwnershipAdminApiError
          ? err.message
          : "Actie mislukt."
      )
      setBusy(false)
    }
  }

  const brand = data?.brand
  const draft = data?.draft

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Sellers &gt; Merkeigenaarschap &gt; Merkpagina
      </p>
      <h1 className="mb-4 text-lg font-bold text-wf-900">
        {(brand?.name as string) || "Merkpagina"}
      </h1>
      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}
      {!data ? (
        <p className="text-sm text-wf-600">Laden…</p>
      ) : (
        <div className="space-y-3 rounded-lg border border-wf-200 bg-white p-4">
          <p className="text-sm text-wf-800">
            <b>Status:</b> {data.page_review_status}
          </p>
          <p className="text-sm text-wf-800">
            <b>Ingediend door:</b> {data.submitted_by || "—"}
          </p>
          <p className="text-sm text-wf-800">
            <b>Intro:</b> {String(draft?.intro || "—")}
          </p>
          <p className="text-sm text-wf-800">
            <b>Verhaal:</b> {String(draft?.story || "—")}
          </p>
          <p className="text-sm text-wf-800">
            <b>Eerdere opmerking:</b> {data.page_review_note || "—"}
          </p>
          <p className="text-xs text-wf-600">
            Een merk uit de productimport is niet geverifieerd. Goedkeuren
            publiceert alleen de merkpagina. Samenvoegen koppelt de producten
            aan een bestaand merk en laat dit merkrecord staan.
          </p>
          <label className="block text-xs font-semibold text-wf-700">
            Bestaand merk-id voor samenvoegen
            <input
              className="mt-1 w-full rounded border border-wf-400 px-3 py-2 text-[12.5px]"
              value={targetBrandId}
              onChange={(e) => setTargetBrandId(e.target.value)}
              placeholder="brand_…"
            />
          </label>
          <label className="block text-xs font-semibold text-wf-700">
            Opmerking / audit
            <textarea
              className="mt-1 min-h-[80px] w-full rounded border border-wf-400 px-3 py-2 text-[12.5px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void decide("approve")}>
              Goedkeuren (publiceren)
            </Button>
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => void decide("request_info")}
            >
              Aanvullende informatie vragen
            </Button>
            <Button
              disabled={busy}
              variant="destructive"
              onClick={() => void decide("reject")}
            >
              Afwijzen
            </Button>
            <Button
              disabled={busy || !targetBrandId.trim()}
              variant="secondary"
              onClick={() => void decide("merge")}
            >
              Samenvoegen met bestaand merk
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
