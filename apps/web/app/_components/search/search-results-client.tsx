"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ListingProduct } from "../../_lib/listing-products"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { countryDisplayLabel, t, tFormat } from "../../_lib/i18n/messages"
import { ProductCard } from "../marketplace/product-card"
import { ListingPagination } from "../marketplace/listing-pagination"
import { ListingEmptyState } from "../marketplace/listing-empty-state"

const PAGE_SIZE = 24
const COUNTRY_OPTIONS = ["NL", "DE", "BE", "FR", "IT", "ES", "PL", "AT", "SE", "DK", "IE", "PT", "FI"] as const

type SearchResultsClientProps = {
  locale?: StorefrontLocale
  products: ListingProduct[]
  totalCount: number
  page: number
}

function updateQuery(
  current: URLSearchParams,
  values: Record<string, string | undefined>
) {
  const next = new URLSearchParams(current.toString())
  for (const [key, value] of Object.entries(values)) {
    if (value == null || value === "") next.delete(key)
    else next.set(key, value)
  }
  return next
}

export function SearchResultsClient({
  locale = DEFAULT_STOREFRONT_LOCALE,
  products,
  totalCount,
  page,
}: SearchResultsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const query = params.get("q") ?? ""
  const category = params.get("categorie") ?? ""
  const brand = params.get("merk") ?? ""
  const manufacturer = params.get("manufacturer") ?? ""
  const country = params.get("country") ?? ""
  const priceMin = params.get("price_min") ?? ""
  const priceMax = params.get("price_max") ?? ""
  const verified = params.get("verified") === "true"
  const sort = params.get("sort") ?? "popularity"

  const summary = useMemo(() => {
    if (!query) return tFormat("searchResultsCount", locale, { count: totalCount })
    return tFormat("searchResultsForCount", locale, { count: totalCount, query })
  }, [locale, totalCount, query])

  function navigate(values: Record<string, string | undefined>) {
    const next = updateQuery(params, values)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="grid gap-5 px-4 pb-10 pt-3 tablet:grid-cols-[250px_1fr] tablet:px-8">
      <aside className="rounded-lg border border-wf-300 p-4">
        <h2 className="mb-3 text-sm font-semibold text-wf-900">
          {t("filters", locale)}
        </h2>
        <div className="space-y-2">
          <input
            value={query}
            onChange={(e) => navigate({ q: e.target.value, page: "1" })}
            placeholder={t("searchPlaceholder", locale)}
            className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
          />
          <input
            value={category}
            onChange={(e) => navigate({ categorie: e.target.value, page: "1" })}
            placeholder={t("searchFilterCategory", locale)}
            className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
          />
          <input
            value={brand}
            onChange={(e) => navigate({ merk: e.target.value, page: "1" })}
            placeholder={t("searchFilterBrand", locale)}
            className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
          />
          <input
            value={manufacturer}
            onChange={(e) => navigate({ manufacturer: e.target.value, page: "1" })}
            placeholder={t("searchFilterManufacturer", locale)}
            className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
          />
          <select
            value={country}
            onChange={(e) => navigate({ country: e.target.value || undefined, page: "1" })}
            className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
          >
            <option value="">{t("searchFilterCountry", locale)}</option>
            {COUNTRY_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {countryDisplayLabel(code, locale)}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={priceMin}
              onChange={(e) => navigate({ price_min: e.target.value, page: "1" })}
              placeholder={t("searchPriceMin", locale)}
              className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
              inputMode="numeric"
            />
            <input
              value={priceMax}
              onChange={(e) => navigate({ price_max: e.target.value, page: "1" })}
              placeholder={t("searchPriceMax", locale)}
              className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
              inputMode="numeric"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-wf-700">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) =>
                navigate({ verified: e.target.checked ? "true" : undefined, page: "1" })
              }
            />
            {t("verifiedOnly", locale)}
          </label>
          <select
            value={sort}
            onChange={(e) => navigate({ sort: e.target.value, page: "1" })}
            className="h-9 w-full rounded border border-wf-300 px-2 text-sm"
          >
            <option value="popularity">{t("sortPopularity", locale)}</option>
            <option value="price_asc">{t("sortPriceAsc", locale)}</option>
            <option value="price_desc">{t("sortPriceDesc", locale)}</option>
            <option value="rating_desc">{t("sortRating", locale)}</option>
            <option value="name_asc">{t("searchSortNameAsc", locale)}</option>
            <option value="name_desc">{t("searchSortNameDesc", locale)}</option>
          </select>
        </div>
      </aside>

      <div>
        <p className="mb-3 text-xs text-wf-600">{summary}</p>
        {products.length === 0 ? (
          <ListingEmptyState
            variant="search"
            query={query || undefined}
            locale={locale}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 tablet:grid-cols-3 desktop:grid-cols-4 desktop:gap-3.5">
            {products.map((product) => (
              <li key={product.slug} className="h-full min-h-[400px]">
                <ProductCard product={product} layout="grid" locale={locale} />
              </li>
            ))}
          </ul>
        )}

        <ListingPagination
          page={page}
          pageCount={pageCount}
          disabled={products.length === 0}
          onPageChange={(nextPage) => navigate({ page: String(nextPage) })}
        />
      </div>
    </div>
  )
}
