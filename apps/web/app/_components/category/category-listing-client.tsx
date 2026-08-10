"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import type { ListingProduct } from "../../_lib/listing-products"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import {
  formatProductsFound,
  matchesCategoryFilters,
  sortCategoryProducts,
  type CategorySortKey,
} from "../../_lib/category-listing"
import type {
  ResolvedCategoryCountry,
  ResolvedCategoryFilterGroup,
} from "../../_lib/cms/resolve-category"
import type { TopListDef } from "../../_lib/category/ultimate-guide"
import { ProductCarouselCard } from "../product/product-carousel"
import { ListingPagination } from "../marketplace/listing-pagination"
import { CategoryFilters } from "./category-filters"
import { CategoryCountryBlock } from "./category-country-block"
import { CategoryEmpty } from "./category-empty"

const PAGE_SIZE = 12

type ControlledListing = {
  activeFilters: Set<string>
  setActiveFilters: Dispatch<SetStateAction<Set<string>>>
  sort: CategorySortKey
  setSort: Dispatch<SetStateAction<CategorySortKey>>
  selectedCountry: string | null
  setSelectedCountry: Dispatch<SetStateAction<string | null>>
}

type CategoryListingClientProps = {
  locale: StorefrontLocale
  products: ListingProduct[]
  filterGroups: ResolvedCategoryFilterGroup[]
  countries: ResolvedCategoryCountry[]
  categoryLabel: string
  controlled?: ControlledListing
  topLists?: TopListDef[]
  topListsHeading?: string
  onTopList?: (list: TopListDef) => void
  highlightProducts?: ListingProduct[]
  highlightLabel?: string | null
  top3Heading?: string
}

/**
 * Category results — toplists + filters + grid (optional controlled state from guide).
 */
export function CategoryListingClient({
  locale,
  products,
  filterGroups,
  countries,
  categoryLabel,
  controlled,
  topLists = [],
  topListsHeading,
  onTopList,
  highlightProducts = [],
  highlightLabel,
  top3Heading,
}: CategoryListingClientProps) {
  const [localFilters, setLocalFilters] = useState<Set<string>>(new Set())
  const [localCountry, setLocalCountry] = useState<string | null>(null)
  const [localSort, setLocalSort] = useState<CategorySortKey>("popularity")
  const [page, setPage] = useState(1)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const activeFilters = controlled?.activeFilters ?? localFilters
  const setActiveFilters = controlled?.setActiveFilters ?? setLocalFilters
  const selectedCountry = controlled?.selectedCountry ?? localCountry
  const setSelectedCountry = controlled?.setSelectedCountry ?? setLocalCountry
  const sort = controlled?.sort ?? localSort
  const setSort = controlled?.setSort ?? setLocalSort

  function toggleFilter(id: string) {
    setPage(1)
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearAll() {
    setActiveFilters(new Set())
    setSelectedCountry(null)
    setPage(1)
  }

  const activeCountries = useMemo(() => {
    const set = new Set<string>()
    if (selectedCountry) set.add(selectedCountry)
    return set
  }, [selectedCountry])

  const filtered = useMemo(() => {
    const matched = products.filter((p) =>
      matchesCategoryFilters(p, activeFilters, filterGroups, activeCountries)
    )
    return sortCategoryProducts(matched, sort)
  }, [products, activeFilters, activeCountries, filterGroups, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const countLabel =
    filtered.length === 0
      ? t("productsZero", locale)
      : formatProductsFound(t("productsFound", locale), filtered.length)

  const activeFilterCount = activeFilters.size + (selectedCountry ? 1 : 0)

  const sidebar = (
    <div>
      <CategoryFilters
        filtersLabel={t("filters", locale)}
        verifiedLabel={t("verifiedOnly", locale)}
        clearLabel={t("clearFilters", locale)}
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearAll}
        showVerifiedFilter={false}
      />
      <CategoryCountryBlock
        title={t("madeIn", locale)}
        allLabel={t("madeInAll", locale)}
        countries={countries}
        selectedCode={selectedCountry}
        onChange={(code) => {
          setSelectedCountry(code)
          setPage(1)
        }}
      />
    </div>
  )

  const sortSelect = (
    <select
      className="h-[34px] w-full rounded-xl border border-wf-300 bg-white px-2.5 text-[12px] text-wf-700 tablet:w-auto"
      value={sort}
      onChange={(e) => {
        setSort(e.target.value as CategorySortKey)
        setPage(1)
      }}
      aria-label={t("sortLabel", locale)}
    >
      <option value="popularity">
        {t("sortLabel", locale)}: {t("sortPopularity", locale)}
      </option>
      <option value="price-asc">{t("sortPriceAsc", locale)}</option>
      <option value="price-desc">{t("sortPriceDesc", locale)}</option>
      <option value="rating">{t("sortRating", locale)}</option>
    </select>
  )

  return (
    <>
      <div className="flex gap-2 px-4 py-2.5 tablet:hidden">
        <button
          type="button"
          className="flex-1 rounded-xl border border-wf-700 py-2 text-center text-[11.5px] font-semibold text-wf-800"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          aria-expanded={mobileFiltersOpen}
        >
          {t("filters", locale)}
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
        <div className="flex-1">{sortSelect}</div>
      </div>

      {mobileFiltersOpen ? (
        <div className="px-4 pb-3 tablet:hidden">{sidebar}</div>
      ) : null}

      <div
        id="category-results"
        className="scroll-mt-4 grid gap-4 px-4 pb-7 pt-1.5 tablet:grid-cols-[240px_1fr] tablet:gap-6 tablet:px-8 tablet:pb-9 tablet:pt-3"
      >
        <div className="hidden tablet:block">{sidebar}</div>

        <div className="min-w-0">
          <div className="mb-2.5 hidden items-center justify-between gap-3 tablet:flex">
            <p className="text-[12px] text-wf-600">{countLabel}</p>
            {sortSelect}
          </div>
          <p className="mb-2.5 text-[12px] text-wf-600 tablet:hidden">
            {countLabel}
          </p>

          {topLists.length > 0 ? (
            <div className="mb-3" data-block="top-lists">
              {topListsHeading ? (
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-wf-500">
                  {topListsHeading}
                </p>
              ) : null}
              <ul className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {topLists.map((list) => (
                  <li key={list.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1)
                        onTopList?.(list)
                      }}
                      className="group flex max-w-[160px] flex-col rounded-xl border border-wf-200 bg-gradient-to-br from-white to-[#f5f6f8] px-2.5 py-2 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-400 hover:shadow-md"
                      data-toplist={list.id}
                    >
                      <span className="text-[14px]" aria-hidden>
                        {list.emoji}
                      </span>
                      <span className="mt-0.5 text-[11.5px] font-bold leading-tight text-wf-900">
                        {list.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-wf-500">
                        {list.subtitle}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {highlightProducts.length > 0 ? (
            <div
              className="mb-3 rounded-xl border border-wf-200 bg-[#f3f6fb] p-2.5"
              data-block="top3-picks"
            >
              <p className="mb-2 text-[12px] font-bold text-wf-900">
                {highlightLabel ?? top3Heading ?? "Top 3"}
              </p>
              <ul className="grid grid-cols-3 gap-2">
                {highlightProducts.map((product, i) => (
                  <li key={product.slug} className="min-w-0">
                    <Link
                      href={`/product/${product.slug}`}
                      className="group block rounded-lg border border-wf-200 bg-white p-1.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-wide text-wf-500">
                        #{i + 1}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-snug text-wf-900">
                        {product.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-wf-500">
                        €{(product.priceCents / 100).toFixed(2)} · {product.rating}
                        ★
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <CategoryEmpty
              title={t("emptyCategoryTitle", locale)}
              body={
                products.length === 0
                  ? t("emptyCategoryBody", locale)
                  : t("noFilterResults", locale)
              }
              homeLabel={t("ctaHome", locale)}
              categoriesLabel={t("ctaBrowseCategories", locale)}
            />
          ) : (
            <ul className="grid grid-cols-2 items-stretch gap-2.5 tablet:grid-cols-3 desktop:grid-cols-4 desktop:gap-3">
              {pageItems.map((product) => (
                <li key={product.slug} className="h-full min-h-0">
                  <ProductCarouselCard
                    product={product}
                    layout="grid"
                    locale={locale}
                  />
                </li>
              ))}
            </ul>
          )}

          <ListingPagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            disabled={filtered.length === 0}
          />
        </div>
      </div>
      <span className="sr-only">{categoryLabel}</span>
    </>
  )
}
