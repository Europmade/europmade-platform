"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import {
  decideEuropeanOwnershipClaim,
  EuropeanOwnershipAdminApiError,
  getEuropeanOwnershipClaim,
  type EuropeanOwnershipClaimRow,
} from "../../../../../lib/european-ownership-admin-api"

export default function EuropeanOwnershipDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || "")
  const [claim, setClaim] = useState<EuropeanOwnershipClaimRow | null>(null)
  const [brandName, setBrandName] = useState<string | null>(null)
  const [manufacturerName, setManufacturerName] = useState<string | null>(null)
  const [history, setHistory] = useState<
    Array<{
      id: string
      from_status: string | null
      to_status: string
      note: string | null
      actor_type: string | null
      decision: string | null
      created_at?: string
    }>
  >([])
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    try {
      const res = await getEuropeanOwnershipClaim(id)
      setClaim(res.claim)
      setBrandName(res.brand?.name || res.claim.brand_id)
      setManufacturerName(
        res.manufacturer?.name || res.claim.manufacturer_id
      )
      setHistory(res.history || [])
      setNote(res.claim.review_note || "")
    } catch (err) {
      setError(
        err instanceof EuropeanOwnershipAdminApiError
          ? err.message
          : "Claim laden mislukt."
      )
    }
  }

  useEffect(() => {
    if (id) void load()
  }, [id])

  async function decide(decision: "approve" | "request_info" | "reject") {
    setBusy(true)
    setError(null)
    try {
      await decideEuropeanOwnershipClaim(id, {
        decision,
        note: note.trim() || undefined,
      })
      router.push("/product-cloud/european-ownership")
    } catch (err) {
      setError(
        err instanceof EuropeanOwnershipAdminApiError
          ? err.message
          : "Beslissing mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (!claim && !error) {
    return <p className="text-xs text-wf-500">Laden…</p>
  }

  return (
    <div>
      <Link
        href="/product-cloud/european-ownership"
        className="text-[11px] font-semibold underline"
      >
        ← Terug naar wachtrij
      </Link>
      <h1 className="mt-3 text-[19px] font-bold text-wf-900">
        Europese eigendom beoordelen
      </h1>
      <p className="mt-1 text-xs text-wf-600">
        Admin-opmerking wordt teruggekoppeld aan de seller. Het percentage
        wijzigt niet automatisch door een beslissing.
      </p>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      {claim ? (
        <div className="mt-4 space-y-3 rounded border border-wf-300 bg-white p-3 text-xs">
          <p>
            <b>Merk:</b> {brandName || "—"}
          </p>
          <p>
            <b>Producent (legacy):</b> {manufacturerName || "—"}
          </p>
          <p>
            <b>Percentage:</b> {claim.ownership_band_label}
          </p>
          <p>
            <b>Bron:</b> {claim.source_label}
          </p>
          <p>
            <b>Status:</b> {claim.status}
          </p>
          <p>
            <b>Bewijs:</b>{" "}
            {claim.evidence_file_id || claim.evidence_note || "—"}
          </p>
          {claim.evidence_note ? (
            <p>
              <b>Seller-notitie:</b> {claim.evidence_note}
            </p>
          ) : null}

          <label className="block font-semibold text-wf-800">
            Opmerking voor seller
            <textarea
              className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optioneel bij goedkeuren; verplicht bij bewijs opvragen of afwijzen."
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void decide("approve")}
            >
              Goedkeuren
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void decide("request_info")}
            >
              Bewijs / info opvragen
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void decide("reject")}
            >
              Afwijzen
            </Button>
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4">
          <h2 className="text-sm font-bold text-wf-900">Historie</h2>
          <ul className="mt-2 space-y-2 text-[11px] text-wf-700">
            {history.map((event) => (
              <li
                key={event.id}
                className="rounded border border-wf-200 bg-wf-50 p-2"
              >
                <p>
                  {event.from_status || "—"} → <b>{event.to_status}</b>
                  {event.decision ? ` (${event.decision})` : ""}
                </p>
                {event.note ? (
                  <p className="mt-1 whitespace-pre-wrap">{event.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
