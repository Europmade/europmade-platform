"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import {
  BrandOwnershipAdminApiError,
  decideBrandOwnershipClaim,
  getBrandOwnershipClaim,
} from "../../../../../lib/brand-ownership-admin-api"

export default function BrandOwnershipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [data, setData] = useState<{
    claim: Record<string, unknown>
    brand: Record<string, unknown>
    seller: Record<string, unknown>
    existing_owner?: Record<string, unknown> | null
  } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const row = await getBrandOwnershipClaim(id)
        setData(row)
      } catch (err) {
        setError(
          err instanceof BrandOwnershipAdminApiError
            ? err.message
            : "Laden mislukt."
        )
      }
    })()
  }, [id])

  async function decide(action: "approve" | "reject" | "request_info") {
    setBusy(true)
    setError(null)
    try {
      await decideBrandOwnershipClaim(id, { action, note })
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

  const claim = data?.claim
  const brand = data?.brand
  const seller = data?.seller
  const company = seller?.company as { legal_name?: string } | undefined

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Sellers &gt; Merkeigenaarschap &gt;{" "}
        <b className="font-semibold text-wf-800">Review</b>
      </p>
      <h1 className="mb-4 text-lg font-bold text-wf-900">
        {(brand?.name as string) || "Merk"}
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
            <b>Seller:</b> {company?.legal_name || (seller?.id as string)}
          </p>
          <p className="text-sm text-wf-800">
            <b>Status:</b> {String(claim?.status)}
          </p>
          <p className="text-sm text-wf-800">
            <b>Bestaande eigenaar:</b>{" "}
            {data.existing_owner
              ? String(
                  (data.existing_owner as { seller_id?: string }).seller_id ||
                    "Ja"
                )
              : "Nog geen geverifieerde merkeigenaar"}
          </p>
          <p className="text-sm text-wf-800">
            <b>Toelichting:</b> {String(claim?.evidence_note || "—")}
          </p>
          <p className="text-sm text-wf-800">
            <b>URL:</b>{" "}
            {claim?.evidence_url ? (
              <a
                className="underline"
                href={String(claim.evidence_url)}
                target="_blank"
                rel="noreferrer"
              >
                {String(claim.evidence_url)}
              </a>
            ) : (
              "—"
            )}
          </p>
          <p className="text-sm text-wf-800">
            <b>Document:</b> {String(claim?.evidence_file_id || "—")}
          </p>
          <p className="text-sm text-wf-800">
            <b>Eerdere opmerking:</b> {String(claim?.review_note || "—")}
          </p>
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
              Goedkeuren
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
          </div>
        </div>
      )}
    </div>
  )
}
