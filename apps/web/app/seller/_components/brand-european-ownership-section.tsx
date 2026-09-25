"use client"

import { useCallback, useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  BrandApiError,
  getSellerBrandEuropeanOwnership,
  upsertSellerBrandEuropeanOwnership,
  uploadSellerBrandMedia,
  type BrandEuropeanOwnershipClaim,
} from "../_lib/brands-api"

const BANDS: { value: string; label: string }[] = [
  { value: "eu_0", label: "0%" },
  { value: "eu_1_25", label: "1–25%" },
  { value: "eu_26_50", label: "26–50%" },
  { value: "eu_51_75", label: "51–75%" },
  { value: "eu_76_99", label: "76–99%" },
  { value: "eu_100", label: "100%" },
  { value: "unknown", label: "Niet bekend" },
]

const SOURCES: { value: string; label: string }[] = [
  { value: "brand_producer", label: "Merk/producent" },
  { value: "factory", label: "Fabriek" },
  { value: "reseller", label: "Reseller" },
  { value: "other", label: "Andere" },
]

type Props = {
  brandId: string
}

/**
 * Seller brand detail: European ownership claim (applies to all products of the brand).
 */
export function BrandEuropeanOwnershipSection({ brandId }: Props) {
  const [claim, setClaim] = useState<BrandEuropeanOwnershipClaim | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [band, setBand] = useState("unknown")
  const [source, setSource] = useState("reseller")
  const [evidenceNote, setEvidenceNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getSellerBrandEuropeanOwnership(brandId)
      setClaim(res.claim)
      setCanEdit(Boolean(res.can_edit))
      if (res.claim) {
        setBand(res.claim.ownership_band)
        setSource(res.claim.source)
        setEvidenceNote(res.claim.evidence_note || "")
      }
    } catch (err) {
      setError(
        err instanceof BrandApiError
          ? err.message
          : "Europese eigendom laden mislukt."
      )
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      let evidenceFileId: string | null | undefined = undefined
      if (file) {
        const uploaded = await uploadSellerBrandMedia(file)
        evidenceFileId =
          (uploaded as { url?: string; storage_reference?: string }).url ||
          (uploaded as { storage_reference?: string }).storage_reference ||
          null
      }
      const res = await upsertSellerBrandEuropeanOwnership(brandId, {
        ownership_band: band,
        source,
        evidence_file_id: evidenceFileId,
        evidence_note: evidenceNote.trim() || null,
      })
      setClaim(res.claim)
      setFile(null)
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof BrandApiError ? err.message : "Opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded border border-wf-300 bg-white p-3">
        <p className="text-xs text-wf-500">Europese eigendom laden…</p>
      </section>
    )
  }

  return (
    <section className="rounded border border-wf-300 bg-white p-3">
      <h2 className="text-xs font-bold text-wf-900">Europese eigendom</h2>
      <p className="mt-1 text-[11px] text-wf-600">
        Geldt voor alle producten van dit merk. Producten tonen deze gegevens
        automatisch als referentie.
      </p>

      {error ? (
        <div className="mt-2">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {saved ? (
        <div className="mt-2">
          <Notice variant="info">Opgeslagen.</Notice>
        </div>
      ) : null}

      {claim?.status === "Bewijs opgevraagd" || claim?.status === "Afgewezen" ? (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-wf-800">
          <p className="font-bold">
            {claim.status === "Bewijs opgevraagd"
              ? "Aanvullende informatie gevraagd"
              : "Afgewezen"}
          </p>
          {claim.review_note ? (
            <p className="mt-1 whitespace-pre-wrap">{claim.review_note}</p>
          ) : null}
        </div>
      ) : null}

      {claim?.status === "Geverifieerd door EuropMade" && claim.review_note ? (
        <div className="mt-2 rounded border border-emerald-300 bg-emerald-50 p-2 text-[11px] text-wf-800">
          <p className="font-bold">Goedgekeurd</p>
          <p className="mt-1 whitespace-pre-wrap">{claim.review_note}</p>
        </div>
      ) : null}

      {claim ? (
        <p className="mt-2 text-[11px] text-wf-600">
          Status: <b>{claim.status}</b>
          {claim.ownership_band_label
            ? ` · Huidig: ${claim.ownership_band_label}`
            : null}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-wf-600">Nog niet opgegeven.</p>
      )}

      {canEdit ? (
        <>
          <label className="mt-3 block text-[11px] font-semibold text-wf-800">
            Europese eigendom
            <select
              className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-xs"
              value={band}
              onChange={(e) => setBand(e.target.value)}
            >
              {BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-[11px] font-semibold text-wf-800">
            Bron
            <select
              className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-xs"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-[11px] font-semibold text-wf-800">
            Toelichting / bewijsnotitie (optioneel)
            <textarea
              className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-xs"
              rows={2}
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
            />
          </label>

          <label className="mt-3 block text-[11px] font-semibold text-wf-800">
            Bewijsdocument (optioneel)
            <input
              type="file"
              className="mt-1 block w-full text-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="mt-3">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-wf-500">
          Alleen merkeigenaar of merkbeheerder kan Europese eigendom wijzigen.
        </p>
      )}
    </section>
  )
}
