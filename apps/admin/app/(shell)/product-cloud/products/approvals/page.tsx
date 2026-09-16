"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  listProductApprovals,
  type ApprovalProductRow,
} from "../../../../../lib/product-approval-admin-api"
import { displayMediaUrl } from "../../../../../lib/media-url"
import {
  ADMIN_PUBLICATION_LABELS,
  ADMIN_WORKFLOW_LABELS,
  adminLabel,
} from "../../../../../lib/admin-status-labels"

/**
 * Productgoedkeuringen — overzicht/shortcut.
 * Beoordeling gebeurt op productdetail.
 */
export default function ProductApprovalsPage() {
  const [rows, setRows] = useState<ApprovalProductRow[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt;{" "}
        <Link href="/product-cloud/products" className="text-wf-700 underline">
          Product Management
        </Link>{" "}
        &gt;{" "}
        <b className="font-semibold text-wf-800">Productgoedkeuringen</b>
      </p>
      <div className="mb-5">
        <h1 className="text-lg font-bold text-wf-900">Productgoedkeuringen</h1>
        <p className="mt-1.5 text-xs text-wf-600">
          Overzicht van producten die admin-actie vragen (in beoordeling,
          pending evidence, of aanvulling).{" "}
          <strong>Review gebeurt op de productdetailpagina.</strong>
        </p>
      </div>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

      {rows === "loading" ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-wf-600">
          Geen producten die nu actie vereisen.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-wf-200 bg-wf-50 text-[11px] uppercase tracking-wide text-wf-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Product</th>
                <th className="px-3 py-2.5 font-semibold">Seller</th>
                <th className="px-3 py-2.5 font-semibold">Wat moet gebeuren</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Actie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-wf-100 align-top">
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {row.primary_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayMediaUrl(row.primary_image_url) || ""}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-wf-100" />
                      )}
                      <div>
                        <p className="font-semibold text-wf-900">
                          {row.title || row.id}
                        </p>
                        <p className="font-mono text-[10px] text-wf-500">
                          {row.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-wf-800">
                    {row.seller_name || row.seller_id || "—"}
                  </td>
                  <td className="px-3 py-3 text-wf-800">
                    {row.action_needed_label || "Review"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline">
                      {row.queue_status_label ||
                        adminLabel(
                          ADMIN_WORKFLOW_LABELS,
                          row.workflow_status || ""
                        ) ||
                        adminLabel(
                          ADMIN_PUBLICATION_LABELS,
                          row.publication_status || ""
                        )}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/product-cloud/products/${row.id}`}
                      className="font-semibold text-wf-800 underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
