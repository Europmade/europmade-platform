"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import {
  ComplianceAdminApiError,
  listComplianceEvidence,
  reviewComplianceEvidence,
  type ComplianceEvidenceRow,
} from "../../../../lib/compliance-admin-api"

const KIND_LABELS: Record<string, string> = {
  made_in_europe: "Made in Europe",
  ce_marking: "CE-markering",
  data_usage: "Datagebruik",
}

/**
 * Minimale admin review voor compliance-bewijs (P2.3).
 */
export default function ComplianceReviewPage() {
  const [rows, setRows] = useState<ComplianceEvidenceRow[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState("pending")
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})

  async function load() {
    setError(null)
    setRows("loading")
    try {
      const res = await listComplianceEvidence(statusTab)
      setRows(res.evidence)
    } catch (err) {
      setError(
        err instanceof ComplianceAdminApiError
          ? err.message
          : "Bewijs laden mislukt."
      )
      setRows([])
    }
  }

  useEffect(() => {
    void load()
  }, [statusTab])

  async function review(
    row: ComplianceEvidenceRow,
    status: "approved" | "rejected" | "needs_info"
  ) {
    const note = rejectReason[row.id]?.trim() || ""
    if (status === "rejected" && !note) {
      setError("Bij afwijzen is een reden verplicht.")
      return
    }
    if (status === "needs_info" && !note) {
      setError("Bij aanvullend bewijs is een toelichting verplicht.")
      return
    }
    setBusyId(row.id)
    setError(null)
    try {
      await reviewComplianceEvidence(row.product_id, row.id, {
        status,
        reason: status === "approved" ? undefined : note,
      })
      await load()
    } catch (err) {
      setError(
        err instanceof ComplianceAdminApiError
          ? err.message
          : "Review mislukt."
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Compliance bewijs</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Beoordeel seller-bewijs. Upload betekent nooit automatische goedkeuring.
      </p>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {(["pending", "needs_info", "approved", "rejected", "all"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusTab(tab)}
            className={`rounded px-2 py-1 text-[11px] font-semibold ${
              statusTab === tab ? "bg-wf-900 text-white" : "bg-wf-100 text-wf-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {rows === "loading" ? (
          <p className="text-xs text-wf-500">Laden…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-wf-600">Geen bewijs in afwachting.</p>
        ) : (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded border border-wf-300 bg-white p-3 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-wf-900">
                    {row.product_title || row.product_id}
                  </p>
                  <p className="mt-1 text-wf-600">
                    Type:{" "}
                    <Badge tone="neutral">
                      {KIND_LABELS[row.evidence_kind] || row.evidence_kind}
                    </Badge>{" "}
                    · Status: {row.verification_status}
                  </p>
                  <p className="mt-1 text-wf-600">
                    EAN: {row.ean || "—"} · Seller: {row.seller_name || row.seller_id || "—"}
                  </p>
                  <p className="mt-1 text-wf-600">
                    Bestand: {row.file_name || row.document_type}
                  </p>
                  <p className="mt-1 text-wf-600">
                    Beoordeeld: {row.verified_at ? new Date(row.verified_at).toLocaleString("nl-NL") : "—"}
                    {" · "}
                    Door: {row.verified_by || "—"}
                  </p>
                  {row.verification_notes ? (
                    <p className="mt-1 text-wf-700">{row.verification_notes}</p>
                  ) : null}
                  <a
                    href={row.storage_reference}
                    className="mt-1 inline-block underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Bewijs openen
                  </a>
                </div>
                <Link
                  href={`/product-cloud/products/${row.product_id}`}
                  className="text-[11px] underline"
                >
                  Productpagina
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Button
                  size="sm"
                  disabled={busyId === row.id}
                  onClick={() => void review(row, "approved")}
                >
                  Goedkeuren
                </Button>
                <Input
                  label="Reden of toelichting"
                  value={rejectReason[row.id] || ""}
                  onChange={(e) =>
                    setRejectReason((prev) => ({
                      ...prev,
                      [row.id]: e.target.value,
                    }))
                  }
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={() => void review(row, "rejected")}
                >
                  Afkeuren
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={() => void review(row, "needs_info")}
                >
                  Aanvullend bewijs
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
