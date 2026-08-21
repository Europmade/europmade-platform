"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { Button, Input, Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import { AffiliateProductImage } from "../../_components/affiliate-product-image"
import {
  AffiliateApiError,
  getAffiliateCommissionSettings,
  type CommissionSettings,
} from "../../../_lib/affiliate-api"
import {
  CatalogApiError,
  listCatalogProducts,
  type CatalogListProduct,
} from "../../../_lib/catalog-api"
import { MARKETPLACE_CATEGORIES } from "../../../_lib/marketplace-categories"
import { formatEuro } from "../../../_components/storefront-shell"

function formatPrice(value: number | null): string {
  if (value == null) return "—"
  return formatEuro(Number(value))
}

export default function AffiliateProductsPage() {
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [products, setProducts] = useState<CatalogListProduct[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<CommissionSettings | null>(null)

  const load = useCallback(async (query: string, cat: string) => {
    setLoading(true)
    setError(null)
    try {
      const [list, commission] = await Promise.all([
        listCatalogProducts({
          q: query.trim() || undefined,
          category: cat || undefined,
          limit: 48,
          offset: 0,
          region_code: "NL",
        }),
        getAffiliateCommissionSettings(),
      ])
      setSettings(commission)
      const sellable = (list.products || []).filter(
        (p) => p.offer_count > 0 && p.from_price != null
      )
      setProducts(sellable)
      setCount(sellable.length)
    } catch (err: unknown) {
      setProducts([])
      setCount(0)
      setError(
        err instanceof AffiliateApiError || err instanceof CatalogApiError
          ? err.message
          : "Producten laden mislukt."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load("", "")
  }, [load])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    void load(q, category)
  }

  return (
    <AffiliateGate
      breadcrumb={[
        { label: "Dashboard", href: "/affiliate/dashboard" },
        { label: "Producten" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Producten</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Zoek verkoopbare EuropMade-producten om te promoten. Platformcommissie:{" "}
        {settings?.percentage_display ?? "…"} (ADR-0030).
      </p>

      <form
        onSubmit={onSearch}
        className="mt-4 flex flex-col gap-3 tablet:flex-row tablet:items-end"
      >
        <div className="min-w-0 flex-1">
          <Input
            label="Zoeken"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Productnaam, SKU of EAN…"
          />
        </div>
        <div className="w-full tablet:w-48">
          <label className="mb-1.5 block text-xs font-semibold text-wf-700">
            Categorie
          </label>
          <select
            className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Alle</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Laden…" : "Zoeken"}
        </Button>
      </form>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <p className="mt-4 text-[11px] text-wf-500">
        {loading ? "Laden…" : `${count} verkoopbare producten`}
      </p>

      <div className="mt-3 grid gap-3 tablet:grid-cols-2">
        {products.map((p) => {
          const href = `/affiliate/dashboard/products/${encodeURIComponent(p.id)}`
          return (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-md border border-wf-300 bg-white"
            >
              <Link href={href} className="flex flex-1 flex-col p-3 hover:bg-wf-50">
                <AffiliateProductImage
                  src={p.image_url}
                  alt={p.title}
                  className="mb-3 aspect-[4/3] w-full rounded bg-wf-50 object-cover"
                />
                <div className="min-h-[2.5rem] text-sm font-semibold text-wf-900 line-clamp-2">
                  {p.title}
                </div>
                <div className="mt-1 text-xs text-wf-600">
                  {formatPrice(p.from_price)}
                  {p.brand_name ? ` · ${p.brand_name}` : ""}
                </div>
                {p.category_names?.length ? (
                  <div className="mt-0.5 text-[10px] text-wf-500">
                    {p.category_names.slice(0, 2).join(", ")}
                  </div>
                ) : null}
                {p.identifier_value ? (
                  <div className="mt-0.5 font-mono text-[10px] text-wf-400">
                    {p.identifier_type || "ID"}: {p.identifier_value}
                  </div>
                ) : null}
                <div className="mt-2 text-[11px] font-medium text-wf-800">
                  Affiliate commissie: {settings?.percentage_display ?? "…"}
                </div>
              </Link>
              <div className="flex gap-2 border-t border-wf-200 px-3 py-3">
                <Link
                  href={href}
                  className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-wf-400 text-xs font-semibold text-wf-800 hover:bg-wf-50"
                >
                  Details
                </Link>
                <Link
                  href={`${href}?promote=1`}
                  className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-wf-900 text-xs font-semibold text-white hover:bg-wf-800"
                >
                  Promoot dit product
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      {!loading && products.length === 0 && !error ? (
        <p className="mt-6 text-sm text-wf-600">
          Geen verkoopbare producten gevonden voor deze zoekopdracht.
        </p>
      ) : null}
    </AffiliateGate>
  )
}
