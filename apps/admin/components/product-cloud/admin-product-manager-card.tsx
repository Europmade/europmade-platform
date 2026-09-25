"use client"

import { useEffect, useMemo, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  assignAdminProductManager,
  ProductApprovalAdminApiError,
  type AdminProductDetail,
} from "../../lib/product-approval-admin-api"

type Props = {
  productId: string
  data: AdminProductDetail
  onSaved: () => void | Promise<void>
}

function candidateKey(c: {
  kind: string
  seller_id: string | null
}): string {
  return `${c.kind}:${c.seller_id || ""}`
}

export function AdminProductManagerCard({ productId, data, onSaved }: Props) {
  const pm = data.product_management
  const candidates = pm?.candidates || []
  const currentKey = pm
    ? candidateKey({
        kind: pm.current.kind,
        seller_id: pm.current.seller_id,
      })
    : "none:"

  const [selected, setSelected] = useState(currentKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setSelected(currentKey)
  }, [currentKey])

  const selectedCandidate = useMemo(
    () => candidates.find((c) => candidateKey(c) === selected) || null,
    [candidates, selected]
  )

  async function onSave() {
    if (!selectedCandidate) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await assignAdminProductManager(productId, {
        kind: selectedCandidate.kind,
        seller_id: selectedCandidate.seller_id,
        transfer_reason: `Admin Productbeheer: ${selectedCandidate.label}`,
      })
      setNotice("Productbeheerder bijgewerkt.")
      await onSaved()
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Productbeheerder opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  const current = pm?.current
  const displayName =
    current?.kind === "seller"
      ? current.seller_name || current.seller_id || "—"
      : current?.kind === "brand_owner"
        ? current.brand_name || "Merkeigenaar"
        : "Geen beheerder"

  return (
    <div className="rounded-lg border border-wf-300 bg-white p-4">
      <h3 className="text-sm font-semibold text-wf-900">Productbeheerder</h3>
      <p className="mt-1 text-[11px] text-wf-600">
        Maximaal één centrale Productbeheerder per Product Cloud-product
        (beheerder van centrale productinformatie). Dit is niet hetzelfde als
        Seller (aanbieder). Alleen offer-sellers of de geverifieerde
        merkeigenaar zijn geldige kandidaten.
      </p>

      <dl className="mt-3 space-y-1.5 text-xs text-wf-800">
        <div className="flex gap-2">
          <dt className="w-36 shrink-0 text-wf-500">Huidige Productbeheerder</dt>
          <dd className="font-semibold">{displayName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-36 shrink-0 text-wf-500">Type</dt>
          <dd>{current?.label || "Geen beheerder"}</dd>
        </div>
      </dl>

      {error ? (
        <Notice variant="warning" className="mt-3">
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice variant="info" className="mt-3">
          {notice}
        </Notice>
      ) : null}

      <label className="mt-4 block text-[11px] font-semibold text-wf-700">
        Productbeheerder wijzigen
        <select
          className="mt-1 w-full rounded border border-wf-300 bg-white px-2 py-2 text-xs"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={busy || candidates.length === 0}
        >
          {candidates.map((c) => (
            <option key={candidateKey(c)} value={candidateKey(c)}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          disabled={busy || !selectedCandidate || selected === currentKey}
          onClick={() => void onSave()}
        >
          {busy ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>

      {pm?.history && pm.history.length > 0 ? (
        <div className="mt-4 border-t border-wf-200 pt-3">
          <p className="text-[11px] font-semibold text-wf-700">Historie</p>
          <ul className="mt-2 space-y-1 text-[11px] text-wf-600">
            {pm.history.slice(0, 5).map((row) => (
              <li key={String(row.id)}>
                {String(row.reason || "Wijziging")} —{" "}
                <span className="font-mono text-[10px]">
                  {String(row.new_value || "").slice(0, 80)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
