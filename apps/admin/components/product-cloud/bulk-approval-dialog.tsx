"use client"

import { useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  applyBulkApproval,
  loadBulkApprovalChoices,
  previewBulkApproval,
  type BulkApprovalReport,
} from "../../lib/product-approval-admin-api"

type Props = {
  mode: "selected" | "relation"
  productIds: string[]
  onClose: (applied: boolean) => void
  onApplied: (message: string) => void
}

function messageOf(err: unknown) {
  return err instanceof ProductApprovalAdminApiError
    ? err.message
    : "Bulkgoedkeuring laden mislukt."
}

export function BulkApprovalDialog({ mode, productIds, onClose, onApplied }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<BulkApprovalReport | null>(null)
  const [applied, setApplied] = useState(false)
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [manufacturers, setManufacturers] = useState<Array<{ id: string; name: string }>>([])
  const [brandId, setBrandId] = useState("")
  const [manufacturerId, setManufacturerId] = useState("")

  useEffect(() => {
    if (mode !== "selected") return
    let cancelled = false
    setBusy(true)
    setError(null)
    void previewBulkApproval({ mode: "selected", product_ids: productIds })
      .then((next) => {
        if (!cancelled) setReport(next)
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err))
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, productIds])

  useEffect(() => {
    if (mode !== "relation") return
    let cancelled = false
    setBusy(true)
    void loadBulkApprovalChoices()
      .then((choices) => {
        if (cancelled) return
        setBrands(choices.brands)
        setManufacturers(choices.manufacturers)
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err))
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  async function previewRelation() {
    setBusy(true)
    setError(null)
    setReport(null)
    setApplied(false)
    try {
      setReport(
        await previewBulkApproval({
          mode: "relation",
          brand_id: brandId || undefined,
          manufacturer_id: manufacturerId || undefined,
        })
      )
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (!report || report.eligible_count < 1) return
    setBusy(true)
    setError(null)
    try {
      const next = await applyBulkApproval(
        mode === "selected"
          ? { mode: "selected", product_ids: productIds }
          : {
              mode: "relation",
              brand_id: brandId || undefined,
              manufacturer_id: manufacturerId || undefined,
            }
      )
      setReport(next)
      setApplied(true)
      onApplied(
        `${next.approved_count} goedgekeurd, ${next.skipped_count} overgeslagen, ${next.failed_count} mislukt.`
      )
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  const blocked = (report?.results || []).filter((row) => row.status !== "eligible" && row.status !== "approved")

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-approval-title"
      onClick={() => {
        if (!busy) onClose(applied)
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-wf-300 bg-white p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="bulk-approval-title" className="text-sm font-bold text-wf-900">
          {mode === "selected"
            ? "Geselecteerde producten goedkeuren"
            : "Producten van een merk of fabrikant goedkeuren"}
        </h2>
        <p className="mt-1 text-[11px] text-wf-600">
          Elk product wordt met dezelfde voorwaarden beoordeeld als individuele
          goedkeuring. Goedkeuren zet de versie op Goedgekeurd en publiceert
          niet. Offers en fabrikantgegevens blijven ongewijzigd. Er wordt geen
          fabrikant aangemaakt.
        </p>
        {mode === "selected" ? (
          <p className="mt-2 text-xs font-semibold text-wf-900">
            {productIds.length} product(en) geselecteerd
          </p>
        ) : (
          <div className="mt-3 grid gap-2 tablet:grid-cols-2">
            <label className="text-[11px] font-semibold text-wf-700">
              Merk
              <select
                className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-xs"
                value={brandId}
                disabled={busy}
                onChange={(event) => {
                  setBrandId(event.target.value)
                  setManufacturerId("")
                  setReport(null)
                }}
              >
                <option value="">Kies een merk…</option>
                {brands.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold text-wf-700">
              Fabrikant
              <select
                className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-xs"
                value={manufacturerId}
                disabled={busy}
                onChange={(event) => {
                  setManufacturerId(event.target.value)
                  setBrandId("")
                  setReport(null)
                }}
              >
                <option value="">Kies een fabrikant…</option>
                {manufacturers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {mode === "relation" ? (
          <p className="mt-2 text-[10px] text-wf-500">
            Alleen producten met dit merk-id of fabrikant-id. Een losse
            fabrikantnaam telt niet. Importbatches zijn niet aan producten
            gekoppeld.
          </p>
        ) : null}
        {error ? (
          <Notice variant="warning" className="mt-3">
            {error}
          </Notice>
        ) : null}
        {report ? (
          <div className="mt-3 text-xs text-wf-800">
            <p className="font-semibold">
              {applied
                ? `${report.approved_count} goedgekeurd, ${report.skipped_count} overgeslagen, ${report.failed_count} mislukt.`
                : `${report.eligible_count} komen in aanmerking, ${report.skipped_count} niet, ${report.failed_count} kon niet worden gecontroleerd.`}
            </p>
            {report.limit_reached ? (
              <p className="mt-1 text-[11px] text-amber-800">
                Er zijn minstens 500 producten gevonden. Alleen deze reeks is
                beoordeeld.
              </p>
            ) : null}
            {blocked.length > 0 ? (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded border border-wf-200 p-2 text-[11px]">
                {blocked.map((row) => (
                  <li key={`${row.product_id}-${row.status}`}>
                    <span className="font-medium">{row.title || row.product_id}</span>
                    {": "}
                    {row.reason || row.status}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onClose(applied)}>
            {applied ? "Sluiten" : "Annuleren"}
          </Button>
          {mode === "relation" && !applied ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || (!brandId && !manufacturerId)}
              onClick={() => void previewRelation()}
            >
              {busy ? "Controleren…" : "Toon geschikte producten"}
            </Button>
          ) : null}
          {!applied ? (
            <Button
              type="button"
              size="sm"
              disabled={busy || !report || report.eligible_count < 1}
              onClick={() => void apply()}
            >
              {busy ? "Bezig…" : `Definitief goedkeuren (${report?.eligible_count ?? 0})`}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
