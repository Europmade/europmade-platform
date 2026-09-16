"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  LIFECYCLE_STATUS_FILTERS,
  PUBLICATION_STATUS_FILTERS,
  ProductApprovalAdminApiError,
  listAdminProducts,
  type ApprovalProductRow,
} from "../../../../lib/product-approval-admin-api"

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const PAGE_SIZE = 100

/**
 * Admin Product Management overzicht (P2.20).
 */
export default function AdminProductsPage() {
  const [rows, setRows] = useState<ApprovalProductRow[] | "loading">("loading")
  const [count, setCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [publicationStatus, setPublicationStatus] = useState("")
  const [lifecycleStatus, setLifecycleStatus] = useState("")
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setError(null)
    setRows("loading")
    try {
      const res = await listAdminProducts({
        q: search || undefined,
        publication_status: publicationStatus || undefined,
        lifecycle_status: lifecycleStatus || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      setRows(res.products)
      setCount(res.count)
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Producten laden mislukt."
      )
      setRows([])
      setCount(0)
    }
  }, [search, publicationStatus, lifecycleStatus, page])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt;{" "}
        <b className="font-semibold text-wf-800">Product Management</b>
      </p>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-wf-900">Product Management</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Zoek, filter en open producten voor beoordeling. Echte API-data —
            geen demo.
          </p>
        </div>
        <Link
          href="/product-cloud/products/approvals"
          className="rounded bg-wf-900 px-3 py-2 text-[11px] font-semibold text-white"
        >
          Productgoedkeuringen
        </Link>
      </div>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <form
          className="min-w-[200px] flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(q.trim())
            setPage(1)
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek op naam, SKU, EAN, seller, merk…"
            className="h-9 w-full rounded-[5px] border border-wf-400 px-3 text-xs text-wf-800"
          />
        </form>
        <select
          value={publicationStatus}
          onChange={(e) => {
            setPublicationStatus(e.target.value)
            setPage(1)
          }}
          className="h-9 rounded-[5px] border border-wf-400 px-2 text-xs text-wf-800"
        >
          {PUBLICATION_STATUS_FILTERS.map((f) => (
            <option key={f.key || "all-pub"} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={lifecycleStatus}
          onChange={(e) => {
            setLifecycleStatus(e.target.value)
            setPage(1)
          }}
          className="h-9 rounded-[5px] border border-wf-400 px-2 text-xs text-wf-800"
        >
          {LIFECYCLE_STATUS_FILTERS.map((f) => (
            <option key={f.key || "all-life"} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {rows === "loading" ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-wf-600">
          <p className="mb-1.5 text-sm font-bold text-wf-800">Geen producten</p>
          <p className="text-xs">Geen resultaten voor deze filter.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    "Product",
                    "Seller",
                    "SKU",
                    "EAN/GTIN",
                    "Categorie",
                    "Merk",
                    "Made in Europe",
                    "Approval",
                    "Compliance",
                    "Aangemaakt",
                    "Gewijzigd",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "actie"}
                      className="border-b border-wf-400 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-wf-100">
                    <td className="border-b border-wf-200 px-3 py-2.5 font-medium text-wf-800">
                      {row.title || row.id.slice(-10)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.seller_id ? (
                        <Link
                          href={`/partners/${row.seller_id}`}
                          className="underline"
                        >
                          {row.seller_name || row.seller_id.slice(-10)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 font-mono text-[10px] text-wf-600">
                      {row.sku_hint || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 font-mono text-[10px] text-wf-600">
                      {row.identifier_value || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {(row.category_names || []).join(", ") || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.brand_name || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.made_in_europe_status || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5">
                      <Badge
                        variant={
                          row.publication_status === "In review"
                            ? "solid"
                            : "outline"
                        }
                      >
                        {row.publication_status || "—"}
                      </Badge>
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.completeness?.compliance_review_status || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {formatDate(row.updated_at)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5">
                      <Link
                        href={`/product-cloud/products/${row.id}`}
                        className="text-[11px] text-wf-800 underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 px-3 py-3.5 text-[11px] text-wf-600 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:justify-between">
            <p>
              {count === 0
                ? "0 van 0 producten"
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, count)} van ${count} producten`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={page <= 1 ? "disabled" : "secondary"}
                disabled={page <= 1 || rows === "loading"}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Vorige
              </Button>
              <span className="px-1 font-semibold text-wf-800">
                Pagina {page} van {Math.max(1, Math.ceil(count / PAGE_SIZE))}
              </span>
              <Button
                type="button"
                size="sm"
                variant={
                  page >= Math.max(1, Math.ceil(count / PAGE_SIZE))
                    ? "disabled"
                    : "secondary"
                }
                disabled={
                  page >= Math.max(1, Math.ceil(count / PAGE_SIZE)) ||
                  rows === "loading"
                }
                onClick={() =>
                  setPage((p) =>
                    Math.min(Math.max(1, Math.ceil(count / PAGE_SIZE)), p + 1)
                  )
                }
              >
                Volgende
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
