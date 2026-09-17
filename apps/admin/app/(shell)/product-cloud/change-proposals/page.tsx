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

  async function decide(
    id: string,
    decision: "accept" | "reject"
  ) {
    setBusyId(id)
    setError(null)
    try {
      await decideChangeProposal(
        id,
        decision,
        decision === "reject"
          ? reasonById[id]?.trim() || "Afgewezen door beheerder"
          : reasonById[id]?.trim()
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
        Voorstellen van sellers die geen Product Cloud-eigenaar zijn
        (titel/beschrijving).
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
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-wf-300 bg-white p-4 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{row.status}</Badge>
                <Link
                  href={`/product-cloud/products/${row.product_id}`}
                  className="font-mono text-[11px] underline"
                >
                  {row.product_id}
                </Link>
                <span className="font-mono text-[10px] text-wf-500">
                  {row.id}
                </span>
              </div>
              {row.proposed_title ? (
                <p className="mt-2 font-semibold text-wf-900">
                  Titel: {row.proposed_title}
                </p>
              ) : null}
              {row.proposed_description ? (
                <p className="mt-1 whitespace-pre-wrap text-wf-700">
                  {row.proposed_description}
                </p>
              ) : null}
              <p className="mt-2 text-wf-600">Toelichting: {row.toelichting}</p>
              <p className="mt-1 font-mono text-[10px] text-wf-500">
                Seller {row.submitter_seller_id}
              </p>
              {row.status === "In behandeling" ? (
                <div className="mt-3 space-y-2">
                  <label className="block text-[11px] text-wf-600">
                    Reden (verplicht bij afwijzen)
                    <input
                      className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-xs"
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
                      Goedkeuren
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
