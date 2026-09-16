"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  ProductLinkAdminApiError,
  listProductLinkGroups,
  type ProductLinkGroupRow,
} from "../../../../lib/product-link-admin-api"

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

/**
 * Admin Product Link Group-wachtrij — review op de detailpagina.
 */
export default function ProductLinkGroupsPage() {
  const [status, setStatus] = useState("proposed")
  const [rows, setRows] = useState<ProductLinkGroupRow[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setRows("loading")
    try {
      const res = await listProductLinkGroups(status)
      setRows(res.product_link_groups)
    } catch (err) {
      setError(
        err instanceof ProductLinkAdminApiError
          ? err.message
          : "Koppelvoorstellen laden mislukt."
      )
      setRows([])
    }
  }, [status])

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
        <b className="font-semibold text-wf-800">Productkoppelingen</b>
      </p>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-wf-900">Productkoppelingen</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Beoordeel voorgestelde koppelingen tussen zelfstandige Product
            Cloud-producten. Goedkeuren maakt de groep actief voor later
            gebruik op de productpagina.
          </p>
        </div>
        <label className="text-[11px] text-wf-600">
          Status
          <select
            className="ml-2 rounded border border-wf-300 bg-white px-2 py-1.5 text-xs text-wf-800"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="proposed">Voorgesteld</option>
            <option value="active">Actief</option>
            <option value="rejected">Afgewezen</option>
            <option value="all">Alles</option>
          </select>
        </label>
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
          Geen koppelgroepen in deze status.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-wf-200 bg-wf-50 text-[11px] uppercase tracking-wide text-wf-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Naam</th>
                <th className="px-3 py-2.5 font-semibold">Seller</th>
                <th className="px-3 py-2.5 font-semibold">Producten</th>
                <th className="px-3 py-2.5 font-semibold">Aangemaakt</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Actie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-wf-100 align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-wf-900">{row.name}</p>
                    <p className="font-mono text-[10px] text-wf-500">{row.id}</p>
                    {row.note ? (
                      <p className="mt-1 text-wf-600">{row.note}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-wf-800">
                    {row.submitter_seller_id}
                  </td>
                  <td className="px-3 py-3 text-wf-800">
                    {row.members.length} · {(row.dimensions || []).join(", ")}
                  </td>
                  <td className="px-3 py-3 text-wf-800">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline">{row.status}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/product-cloud/product-links/${row.id}`}
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
