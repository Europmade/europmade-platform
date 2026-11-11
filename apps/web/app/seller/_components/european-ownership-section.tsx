"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button, Notice } from "@europmade/ui"
import {
  getEuropeanOwnershipClaim,
  ProductCloudApiError,
  upsertEuropeanOwnershipClaim,
  type EuropeanOwnershipClaim,
} from "../_lib/product-cloud-api"

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
  productId: string
}

/**
 * Product Compliance: European ownership inherited from the brand.
 * Editable when the seller may manage the brand (same API as Seller → Merken).
 */
export function EuropeanOwnershipSection({ productId }: Props) {
  const [claim, setClaim] = useState<EuropeanOwnershipClaim | null>(null)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [manageAt, setManageAt] = useState<string | null>(null)
  const [band, setBand] = useState("unknown")
  const [source, setSource] = useState("brand_producer")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getEuropeanOwnershipClaim(productId)
      setClaim(res.claim)
      setBrandId(res.brand_id || res.claim?.brand_id || null)
      setCanEdit(Boolean((res as { can_edit?: boolean }).can_edit))
      setManageAt(res.manage_at || null)
      if (res.claim) {
        setBand(res.claim.ownership_band)
        setSource(res.claim.source || "brand_producer")
      }
    } catch (err) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Europese eigendom laden mislukt."
      )
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const res = await upsertEuropeanOwnershipClaim(productId, {
        ownership_band: band,
        source,
      })
      setClaim(res.claim)
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-wf-500">Europese eigendom laden…</p>
  }

  return (
    <section className="rounded border border-wf-300 bg-white p-3">
      <h3 className="text-sm font-bold text-wf-900">
        Europees eigendom van het merk
      </h3>
      <p className="mt-1 text-[11px] text-wf-600">
        Geldt voor alle producten van dit merk. Los van de Made in Europe-score
        en van productiebewijs.
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

      {!brandId ? (
        <p className="mt-2 text-[11px] text-wf-600">
          Koppel eerst een merk om Europese eigendom te beheren.
        </p>
      ) : canEdit ? (
        <>
          <label className="mt-3 block text-[11px] font-semibold text-wf-800">
            Europees eigendom van het merk
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
          {claim ? (
            <p className="mt-2 text-[11px] text-wf-600">
              Status: <b>{claim.status}</b>
            </p>
          ) : null}
          <div className="mt-3">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </>
      ) : claim ? (
        <dl className="mt-3 space-y-1.5 text-xs text-wf-800">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-wf-500">Europese eigendom</dt>
            <dd className="font-semibold">
              {claim.ownership_band_label || claim.ownership_band}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-wf-500">Bron</dt>
            <dd>{claim.source_label || claim.source}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-wf-500">Status</dt>
            <dd>{claim.status}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-[11px] text-wf-600">
          Nog niet opgegeven voor dit merk.
        </p>
      )}

      {brandId && manageAt ? (
        <p className="mt-3 text-[11px]">
          <Link
            href={manageAt}
            className="font-semibold underline"
          >
            Uitgebreid beheer bij het merk
          </Link>
        </p>
      ) : null}
    </section>
  )
}
