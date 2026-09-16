"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  ProductLinkAdminApiError,
  decideProductLinkGroup,
  getProductLinkGroup,
  type ProductLinkGroupRow,
} from "../../../../../lib/product-link-admin-api"

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatValues(values: Record<string, string> | undefined) {
  if (!values) return "—"
  return Object.entries(values)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ")
}

export default function ProductLinkGroupDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [row, setRow] = useState<ProductLinkGroupRow | "loading" | null>(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setRow("loading")
    try {
      const res = await getProductLinkGroup(id)
      setRow(res.product_link_group)
    } catch (err) {
      setError(
        err instanceof ProductLinkAdminApiError
          ? err.message
          : "Koppelgroep laden mislukt."
      )
      setRow(null)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function decide(decision: "approve" | "reject") {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      const res = await decideProductLinkGroup(id, decision, reason.trim())
      setRow(res.product_link_group)
    } catch (err) {
      setError(
        err instanceof ProductLinkAdminApiError
          ? err.message
          : "Beslissing opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt;{" "}
        <Link
          href="/product-cloud/product-links"
          className="text-wf-700 underline"
        >
          Productkoppelingen
        </Link>{" "}
        &gt; <b className="font-semibold text-wf-800">Review</b>
      </p>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

      {row === "loading" ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : !row ? (
        <p className="py-10 text-center text-sm text-wf-600">
          Koppelgroep niet gevonden.
        </p>
      ) : (
        <>
          <div className="mb-5">
            <h1 className="text-lg font-bold text-wf-900">{row.name}</h1>
            <p className="mt-1 font-mono text-[11px] text-wf-500">{row.id}</p>
            <p className="mt-2 text-xs text-wf-600">
              Status <Badge variant="outline">{row.status}</Badge>
              {" · "}Seller{" "}
              <span className="font-mono">{row.submitter_seller_id}</span>
              {" · "}Aangemaakt {formatDate(row.created_at)}
            </p>
            {row.note ? (
              <p className="mt-2 text-sm text-wf-800">Toelichting: {row.note}</p>
            ) : null}
            {row.decision_reason ? (
              <p className="mt-2 text-sm text-wf-800">
                Beslissing: {row.decision_reason}
              </p>
            ) : null}
          </div>

          <div className="mb-6 overflow-x-auto rounded-lg border border-wf-300 bg-white">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-wf-200 bg-wf-50 text-[11px] uppercase tracking-wide text-wf-500">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <th className="px-3 py-2.5 font-semibold">Dimensiewaarden</th>
                </tr>
              </thead>
              <tbody>
                {row.members.map((member) => (
                  <tr key={member.id} className="border-b border-wf-100">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-wf-900">
                        {member.product_title || member.product_id}
                      </p>
                      <p className="font-mono text-[10px] text-wf-500">
                        {member.product_id}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-wf-800">
                      {formatValues(member.values)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {row.status === "proposed" ? (
            <div className="rounded-lg border border-wf-300 bg-white p-4">
              <label className="block text-xs text-wf-600">
                Reden (optioneel)
                <textarea
                  className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-sm"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
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
                  onClick={() => void decide("reject")}
                >
                  Afwijzen
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-wf-600">
              Deze groep is al beslist en kan niet opnieuw worden
              goedgekeurd of afgewezen.
            </p>
          )}
        </>
      )}
    </div>
  )
}
