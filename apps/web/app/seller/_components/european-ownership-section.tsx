"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import {
  getEuropeanOwnershipClaim,
  ProductCloudApiError,
  type EuropeanOwnershipClaim,
} from "../_lib/product-cloud-api"

type Props = {
  productId: string
}

/**
 * Product Compliance: read-only European ownership inherited from the brand.
 * Editing happens under Seller → Merken → [merk].
 */
export function EuropeanOwnershipSection({ productId }: Props) {
  const [claim, setClaim] = useState<EuropeanOwnershipClaim | null>(null)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getEuropeanOwnershipClaim(productId)
      setClaim(res.claim)
      setBrandId(res.brand_id || res.claim?.brand_id || null)
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

  if (loading) {
    return <p className="text-xs text-wf-500">Europese eigendom laden…</p>
  }

  return (
    <section className="rounded border border-wf-300 bg-white p-3">
      <h3 className="text-sm font-bold text-wf-900">Europese eigendom</h3>
      <p className="mt-1 text-[11px] text-wf-600">
        Overgenomen van het merk. Beheer gebeurt onder{" "}
        <b>Seller → Merken</b>, niet per product.
      </p>

      {error ? (
        <div className="mt-2">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}

      {!brandId ? (
        <p className="mt-2 text-[11px] text-wf-600">
          Koppel eerst een merk om Europese eigendom te tonen.
        </p>
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

      {brandId ? (
        <p className="mt-3 text-[11px]">
          <Link
            href={`/seller/brands/${encodeURIComponent(brandId)}`}
            className="font-semibold underline"
          >
            Beheer Europese eigendom bij het merk
          </Link>
        </p>
      ) : null}
    </section>
  )
}
