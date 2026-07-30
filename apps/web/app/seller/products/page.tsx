"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import {
  listOwnProducts,
  ProductCloudApiError,
  type CatalogProduct,
} from "../_lib/product-cloud-api"

export default function SellerProductsPage() {
  const [products, setProducts] = useState<CatalogProduct[] | "loading" | "error">(
    "loading"
  )
  const [query, setQuery] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listOwnProducts()
      .then((res) => {
        if (!cancelled) setProducts(res.products)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof ProductCloudApiError
            ? err.message
            : "Producten laden mislukt."
        setErrorMessage(message)
        setProducts("error")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (products === "loading" || products === "error") return []
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const hay = [
        p.title,
        p.identifier_value,
        p.brand_id,
        p.lifecycle_status,
        ...(p.category_names ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [products, query])

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Producten" },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">Productoverzicht</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Jouw Product Cloud-records (eigenaarschap). Filter of zoek, of voeg
            een product toe via EAN.
          </p>
        </div>
        <Link
          href="/seller/products/add"
          className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
        >
          Product toevoegen
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="min-w-[160px] flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op titel, EAN, merk…"
            aria-label="Zoek producten"
          />
        </div>
      </div>

      {products === "loading" ? (
        <p className="text-sm text-wf-600">Laden…</p>
      ) : products === "error" ? (
        <Notice variant="warning">{errorMessage}</Notice>
      ) : filtered.length === 0 ? (
        <div className="px-7 py-[60px] text-center text-wf-600">
          <div className="mx-auto mb-3.5 h-11 w-11 rounded-full border border-dashed border-wf-400" />
          <p className="mb-1.5 text-sm font-bold text-wf-800">Geen producten</p>
          <p className="text-xs text-wf-600">
            Je hebt nog geen Product Cloud-records, of je zoekfilter leverde
            niets op.
          </p>
          <div className="mt-5">
            <Link
              href="/seller/products/add"
              className="inline-flex rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white"
            >
              Product toevoegen — EAN-zoeken
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-wf-300">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border-b border-wf-400 px-7 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Titel
                </th>
                <th className="border-b border-wf-400 px-7 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  EAN / ID
                </th>
                <th className="border-b border-wf-400 px-7 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Status
                </th>
                <th className="border-b border-wf-400 px-7 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Categorie
                </th>
                <th className="border-b border-wf-400 px-7 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Aanbod
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="border-b border-wf-200 px-7 py-2.5 text-wf-800">
                    {p.title ?? "—"}
                  </td>
                  <td className="border-b border-wf-200 px-7 py-2.5 text-wf-800">
                    {p.identifier_value ?? "—"}
                  </td>
                  <td className="border-b border-wf-200 px-7 py-2.5">
                    <Badge>{p.lifecycle_status}</Badge>
                  </td>
                  <td className="border-b border-wf-200 px-7 py-2.5 text-wf-800">
                    {p.category_names?.length
                      ? p.category_names.join(" > ")
                      : "—"}
                  </td>
                  <td className="border-b border-wf-200 px-7 py-2.5">
                    {p.identifier_id ? (
                      <Link
                        href={`/seller/products/offer?identifier_id=${encodeURIComponent(p.identifier_id)}`}
                        className="text-xs font-semibold text-wf-800 underline"
                      >
                        Commercieel
                      </Link>
                    ) : (
                      <span className="text-wf-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-7 py-3.5 text-[11px] text-wf-500">
            {filtered.length} van {products.length} producten
          </div>
        </div>
      )}
    </SellerGate>
  )
}
