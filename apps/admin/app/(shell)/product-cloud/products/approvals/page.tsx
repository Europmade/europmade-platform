"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  decideProductApproval,
  listProductApprovals,
  type ApprovalProductRow,
} from "../../../../../lib/product-approval-admin-api"
import { displayMediaUrl } from "../../../../../lib/media-url"

type ConfirmState =
  | null
  | { id: string; decision: "approved" | "rejected" }

/**
 * Admin product approval queue (P2.20).
 * Uses existing POST /admin/product-cloud/products/:id/approval.
 */
export default function ProductApprovalsPage() {
  const [rows, setRows] = useState<ApprovalProductRow[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const load = useCallback(async () => {
    setError(null)
    setRows("loading")
    try {
      const res = await listProductApprovals()
      setRows(res.products)
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Wachtrij laden mislukt."
      )
      setRows([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function execute(row: ApprovalProductRow, decision: "approved" | "rejected") {
    if (decision === "rejected" && !(reason[row.id] || "").trim()) {
      setError("Reden is verplicht bij afwijzen.")
      return
    }
    setBusyId(row.id)
    setError(null)
    setSuccess(null)
    try {
      await decideProductApproval(row.id, {
        decision,
        reason: reason[row.id],
      })
      setConfirm(null)
      setSuccess(
        decision === "approved"
          ? `${row.title || row.id} goedgekeurd.`
          : `${row.title || row.id} afgewezen.`
      )
      await load()
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
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
        <Link href="/product-cloud/products" className="text-wf-700 underline">
          Product Management
        </Link>{" "}
        &gt; <b className="font-semibold text-wf-800">Approval queue</b>
      </p>
      <div className="mb-5">
        <h1 className="text-lg font-bold text-wf-900">Productgoedkeuringen</h1>
        <p className="mt-1.5 text-xs text-wf-600">
          Producten met publicatiestatus &quot;In review&quot;. Dit is
          productpublicatie-goedkeuring — niet CE / Made in Europe
          evidence-review.
        </p>
      </div>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}
      {success ? (
        <Notice variant="warning" className="mb-4">
          {success}
        </Notice>
      ) : null}

      <Notice variant="warning" className="mb-4">
        <p className="text-xs">
          &quot;Aanvullende informatie opvragen&quot; bestaat niet voor
          productgoedkeuring. Alleen goedkeuren of afwijzen (met verplichte
          reden).
        </p>
      </Notice>

      {rows === "loading" ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-wf-600">
          <p className="mb-1.5 text-sm font-bold text-wf-800">Wachtrij leeg</p>
          <p className="text-xs">Geen producten wachten op goedkeuring.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="flex flex-wrap gap-3 rounded-lg border border-wf-300 bg-white p-4"
            >
              {displayMediaUrl(row.primary_image_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayMediaUrl(row.primary_image_url) ?? ""}
                  alt=""
                  className="h-16 w-16 rounded object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-wf-100 text-[10px] text-wf-500">
                  Geen foto
                </div>
              )}
              <div className="min-w-0 flex-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-wf-900">
                    {row.title || row.id}
                  </p>
                  <Badge variant="solid">
                    {row.publication_status || "In review"}
                  </Badge>
                </div>
                <p className="mt-1 text-wf-600">
                  Seller:{" "}
                  {row.seller_id ? (
                    <Link
                      href={`/partners/${row.seller_id}`}
                      className="underline"
                    >
                      {row.seller_name || row.seller_id.slice(-10)}
                    </Link>
                  ) : (
                    "—"
                  )}{" "}
                  · EAN {row.identifier_value || "—"} · SKU{" "}
                  {row.sku_hint || "—"}
                </p>
                <p className="mt-1 text-wf-600">
                  {(row.category_names || []).join(", ") || "—"} · Completeness{" "}
                  {row.completeness?.percent ?? 0}% · Compliance{" "}
                  {row.completeness?.compliance_review_status || "—"} · MiE{" "}
                  {row.made_in_europe_status || "—"}
                </p>
                <p className="mt-1 text-[10px] text-wf-500">
                  Aangevraagd:{" "}
                  {row.requested_at
                    ? new Date(row.requested_at).toLocaleString("nl-NL")
                    : "—"}
                </p>

                {confirm?.id === row.id ? (
                  <div className="mt-3 rounded border border-wf-300 bg-wf-50 p-3">
                    <p className="mb-2 font-semibold">
                      {confirm.decision === "approved"
                        ? "Goedkeuren bevestigen?"
                        : "Afwijzen bevestigen?"}
                    </p>
                    <p className="mb-2 text-[11px]">
                      {row.title} · {row.seller_name || row.seller_id} ·{" "}
                      {row.publication_status}
                    </p>
                    {confirm.decision === "rejected" ? (
                      <textarea
                        value={reason[row.id] || ""}
                        onChange={(e) =>
                          setReason((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        placeholder="Reden verplicht…"
                        className="mb-2 min-h-[60px] w-full rounded border border-wf-400 px-2 py-1.5 text-xs"
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={
                          confirm.decision === "rejected"
                            ? "destructive"
                            : undefined
                        }
                        disabled={busyId === row.id}
                        onClick={() => void execute(row, confirm.decision)}
                      >
                        {busyId === row.id ? "Bezig…" : "Bevestigen"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConfirm(null)}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/product-cloud/products/${row.id}`}
                      className="text-[11px] font-semibold underline"
                    >
                      Open Review Center
                    </Link>
                    <Button
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() =>
                        setConfirm({ id: row.id, decision: "approved" })
                      }
                    >
                      Goedkeuren
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === row.id}
                      onClick={() =>
                        setConfirm({ id: row.id, decision: "rejected" })
                      }
                    >
                      Afwijzen
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
