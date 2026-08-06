"use client"

import { useMemo, useState } from "react"
import { Checkbox } from "@europmade/ui"
import {
  discountPercent,
  type ListingProduct,
} from "../../_lib/listing-products"
import { ListingEmptyState } from "./listing-empty-state"
import { ListingPagination } from "./listing-pagination"
import { ProductCard } from "./product-card"

type SortKey = "popularity" | "price-asc" | "price-desc" | "rating"

const PAGE_SIZE = 12

const FILTER_GROUPS = [
  {
    legend: "Prijs",
    options: [
      { id: "price-0-100", label: "€0 – €100" },
      { id: "price-100-300", label: "€100 – €300" },
    ],
  },
  {
    legend: "Land van productie",
    options: [
      { id: "country-nl", label: "Nederland" },
      { id: "country-de", label: "Duitsland" },
    ],
  },
  {
    legend: "Korting",
    options: [{ id: "discount-only", label: "Alleen producten met korting" }],
  },
] as const

type ListingResultsProps = {
  products: ListingProduct[]
  emptyVariant: "search" | "category" | "catalog-pending"
  searchQuery?: string
  categoryLabel?: string
}

function matchesFilters(
  product: ListingProduct,
  active: Set<string>
): boolean {
  if (active.size === 0) return true

  const priceFilters = [...active].filter((id) => id.startsWith("price-"))
  if (priceFilters.length > 0) {
    const euros = product.priceCents / 100
    const ok = priceFilters.some((id) => {
      if (id === "price-0-100") return euros <= 100
      if (id === "price-100-300") return euros > 100 && euros <= 300
      return false
    })
    if (!ok) return false
  }

  const countryFilters = [...active].filter((id) => id.startsWith("country-"))
  if (countryFilters.length > 0) {
    const ok = countryFilters.some((id) => {
      if (id === "country-nl") return product.countryCode === "NL"
      if (id === "country-de") return product.countryCode === "DE"
      return false
    })
    if (!ok) return false
  }

  if (active.has("discount-only") && discountPercent(product) == null) {
    return false
  }

  return true
}

function sortProducts(products: ListingProduct[], sort: SortKey) {
  const copy = [...products]
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.priceCents - b.priceCents)
    case "price-desc":
      return copy.sort((a, b) => b.priceCents - a.priceCents)
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating)
    case "popularity":
    default:
      return copy.sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
  }
}

/**
 * Interactieve resultatenkolom: filters/sortering/paginering over seed-data
 * (geen catalogus-API). Visueel conform marketplace-listing wireframe.
 */
export function ListingResults({
  products,
  emptyVariant,
  searchQuery,
  categoryLabel,
}: ListingResultsProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortKey>("popularity")
  const [page, setPage] = useState(1)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  function toggleFilter(id: string) {
    setPage(1)
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    const matched = products.filter((p) => matchesFilters(p, activeFilters))
    return sortProducts(matched, sort)
  }, [products, activeFilters, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const filtersPanel = (
    <aside
      className="rounded-lg border border-wf-300 p-4"
      aria-label="Filters"
      data-filter-architecture="manual"
      data-ai-filters-ready="true"
    >
      {/* AI-filters: zelfde aside + Checkbox-contract; later AI-suggesties als extra FILTER_GROUPS-bron. */}
      <p className="mb-3 hidden text-[10px] text-wf-500" data-ai-filters-slot>
        AI-filters beschikbaar wanneer de zoek-/catalogusservice dit levert.
      </p>
      {FILTER_GROUPS.map((group) => (
        <fieldset
          key={group.legend}
          className="mb-3 border-b border-wf-200 pb-3 last:mb-0 last:border-b-0 last:pb-0"
        >
          <legend className="mb-2 text-xs font-bold text-wf-900">
            {group.legend}
          </legend>
          <div className="space-y-1.5">
            {group.options.map((opt) => (
              <Checkbox
                key={opt.id}
                id={`filter-${opt.id}`}
                label={opt.label}
                checked={activeFilters.has(opt.id)}
                onChange={() => toggleFilter(opt.id)}
              />
            ))}
          </div>
        </fieldset>
      ))}
      {activeFilters.size > 0 ? (
        <button
          type="button"
          className="mt-1 text-[11px] font-semibold text-wf-700 underline"
          onClick={() => {
            setActiveFilters(new Set())
            setPage(1)
          }}
        >
          Filters wissen
        </button>
      ) : null}
    </aside>
  )

  return (
    <>
      <div className="flex gap-2 px-4 py-3 tablet:hidden">
        <button
          type="button"
          className="flex-1 rounded-md border border-wf-700 py-2 text-center text-[11.5px] font-semibold text-wf-800"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          aria-expanded={mobileFiltersOpen}
        >
          Filters{activeFilters.size > 0 ? ` (${activeFilters.size})` : ""}
        </button>
        <label className="flex-1">
          <span className="sr-only">Sorteren</span>
          <select
            className="h-full w-full rounded-md border border-wf-400 bg-white px-2 text-[11.5px] text-wf-700"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey)
              setPage(1)
            }}
            aria-label="Sorteren"
          >
            <option value="popularity">Sorteren ▾</option>
            <option value="price-asc">Prijs: laag → hoog</option>
            <option value="price-desc">Prijs: hoog → laag</option>
            <option value="rating">Beoordeling</option>
          </select>
        </label>
      </div>

      {mobileFiltersOpen ? (
        <div className="px-4 pb-3 tablet:hidden">{filtersPanel}</div>
      ) : null}

      <div className="grid gap-5 px-4 pb-10 pt-2 tablet:grid-cols-[220px_1fr] tablet:gap-7 tablet:px-8 tablet:pb-10 tablet:pt-5">
        <div className="hidden tablet:block">{filtersPanel}</div>

        <div className="min-w-0">
          <div className="mb-4 hidden items-center justify-between tablet:flex">
            <p className="text-xs text-wf-600">
              {filtered.length === 0
                ? "0 producten"
                : `${pageItems.length} van ${filtered.length} producten`}
            </p>
            <select
              className="h-[34px] rounded-wf border border-wf-400 bg-white px-2.5 text-xs text-wf-700"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey)
                setPage(1)
              }}
              aria-label="Sorteren"
            >
              <option value="popularity">Sorteren: Populariteit</option>
              <option value="price-asc">Sorteren: Prijs (laag → hoog)</option>
              <option value="price-desc">Sorteren: Prijs (hoog → laag)</option>
              <option value="rating">Sorteren: Beoordeling</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <ListingEmptyState
              variant={emptyVariant === "catalog-pending" ? "category" : emptyVariant}
              query={searchQuery}
              categoryLabel={categoryLabel}
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2.5 tablet:hidden">
                {pageItems.map((product) => (
                  <li key={product.slug}>
                    <ProductCard product={product} layout="list" />
                  </li>
                ))}
              </ul>
              <ul className="hidden grid-cols-3 items-stretch gap-3 tablet:grid desktop:grid-cols-4 desktop:gap-3.5">
                {pageItems.map((product) => (
                  <li key={product.slug} className="h-full min-h-[400px]">
                    <ProductCard product={product} layout="grid" />
                  </li>
                ))}
              </ul>
            </>
          )}

          <ListingPagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            disabled={filtered.length === 0}
          />
        </div>
      </div>
    </>
  )
}
