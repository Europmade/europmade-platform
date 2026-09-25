"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  ChangeProposalAdminApiError,
  decideChangeProposal,
  listChangeProposals,
  type AdminChangeProposal,
} from "../../../../lib/change-proposal-admin-api"
import { displayMediaUrl } from "../../../../lib/media-url"

function FieldChanges({ row }: { row: AdminChangeProposal }) {
  const changes = row.proposed_fields?.changes
  if (changes && changes.length > 0) {
    return (
      <div className="mt-3 space-y-2">
        {changes.map((c, idx) => (
          <div
            key={`${c.field}-${c.attribute_definition_id || idx}`}
            className="rounded border border-wf-200 bg-wf-50/60 p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
              Onderdeel / veld
            </p>
            <p className="font-semibold text-wf-900">{c.label}</p>
            <div className="mt-2 grid gap-2 tablet:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Huidige waarde
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-wf-700">
                  {c.current_value?.trim() || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Voorgestelde waarde
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] font-medium text-wf-900">
                  {c.proposed_value || "—"}
                </p>
              </div>
            </div>
            {c.storage_references?.length ? (
              <div className="mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Voorgestelde media
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {c.storage_references.map((ref) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={ref}
                      src={displayMediaUrl(ref)}
                      alt="Voorgestelde media"
                      className="h-20 w-20 rounded border border-wf-300 object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="mt-3 space-y-1 text-[11px]">
      {row.proposed_title ? (
        <p>
          <span className="text-wf-500">Productnaam: </span>
          <span className="font-semibold text-wf-900">{row.proposed_title}</span>
        </p>
      ) : null}
      {row.proposed_description ? (
        <p className="whitespace-pre-wrap text-wf-700">
          {row.proposed_description}
        </p>
      ) : null}
    </div>
  )
}

export default function AdminChangeProposalsPage() {
  const [rows, setRows] = useState<AdminChangeProposal[] | "loading">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reasonById, setReasonById] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError(null)
    setRows("loading")
    try {
      const res = await listChangeProposals()
      setRows(res.change_proposals)
    } catch (err) {
      setError(
        err instanceof ChangeProposalAdminApiError
          ? err.message
          : "Wijzigingsvoorstellen laden mislukt."
      )
      setRows([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function decide(id: string, decision: "accept" | "reject") {
    const reason = reasonById[id]?.trim() || ""
    if (decision === "reject" && !reason) {
      setError("Afwijzen vereist een reden/terugkoppeling.")
      return
    }
    setBusyId(id)
    setError(null)
    try {
      // One action: decide + apply (accept) or reject + audit. No second save.
      await decideChangeProposal(
        id,
        decision,
        reason || undefined
      )
      await load()
    } catch (err) {
      setError(
        err instanceof ChangeProposalAdminApiError
          ? err.message
          : "Beslissing opslaan mislukt."
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt;{" "}
        <b className="font-semibold text-wf-800">Wijzigingsvoorstellen</b>
      </p>
      <h1 className="text-lg font-bold text-wf-900">
        Centrale productwijzigingen
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Voorstellen van sellers die geen Productbeheerder zijn. Beoordeel hier
        de inhoud; Goedkeuren past direct toe, Afwijzen vereist een reden.
      </p>

      {error ? (
        <Notice variant="warning" className="mb-4 mt-4">
          {error}
        </Notice>
      ) : null}

      {rows === "loading" ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-wf-600">
          Geen openstaande wijzigingsvoorstellen.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-wf-300 bg-white p-4 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-wf-900">
                    {row.product_title || "Product zonder titel"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-wf-500">
                    Product ID: {row.product_id}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-wf-500">
                    Voorstel: {row.id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{row.status}</Badge>
                  {row.created_at ? (
                    <span className="text-[10px] text-wf-500">
                      {new Date(row.created_at).toLocaleString("nl-NL")}
                    </span>
                  ) : null}
                </div>
              </div>

              <dl className="mt-3 grid gap-1 text-[11px] text-wf-700 tablet:grid-cols-2">
                <div>
                  <dt className="text-wf-500">Seller</dt>
                  <dd className="font-medium">
                    {row.submitter_seller_name || row.submitter_seller_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-wf-500">Datum</dt>
                  <dd>
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString("nl-NL")
                      : "—"}
                  </dd>
                </div>
              </dl>

              <FieldChanges row={row} />

              <div className="mt-3 rounded border border-wf-200 bg-white p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Toelichting van seller
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-wf-800">
                  {row.toelichting || "—"}
                </p>
              </div>

              <div className="mt-3">
                <Link
                  href={`/product-cloud/products/${row.product_id}?proposal=${encodeURIComponent(row.id)}`}
                  className="text-[11px] font-medium text-wf-800 underline"
                >
                  Productdetail openen
                </Link>
              </div>

              {row.status === "In behandeling" ? (
                <div className="mt-3 space-y-2 border-t border-wf-200 pt-3">
                  <label className="block text-[11px] text-wf-600">
                    Terugkoppeling (verplicht bij afwijzen, optioneel bij
                    goedkeuren)
                    <textarea
                      className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-xs"
                      rows={2}
                      value={reasonById[row.id] || ""}
                      onChange={(e) =>
                        setReasonById((cur) => ({
                          ...cur,
                          [row.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row.id, "accept")}
                    >
                      {busyId === row.id ? "Bezig…" : "Goedkeuren"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row.id, "reject")}
                    >
                      Afwijzen
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
