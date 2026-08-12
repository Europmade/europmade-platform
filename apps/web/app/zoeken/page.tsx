import type { Metadata } from "next"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import { SearchResultsClient } from "../_components/search/search-results-client"
import Link from "next/link"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t, tFormat } from "../_lib/i18n/messages"
import { resolveListingProducts } from "../_lib/storefront-catalog"

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readQuery(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? ""
  return value?.trim() ?? ""
}

function readNumber(value: string | string[] | undefined): number | undefined {
  const raw = readQuery(value)
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const q = readQuery((await searchParams).q)
  const title = q
    ? `${tFormat("searchResultsTitleFor", locale, { query: q })} — EuropMade`
    : `${t("searchLabel", locale)} — EuropMade`
  return {
    title,
    description: t("searchPlaceholder", locale),
    robots: { index: false, follow: true },
    alternates: {
      canonical: q ? `/zoeken?q=${encodeURIComponent(q)}` : "/zoeken",
    },
  }
}

/**
 * Zoekresultaten — scherm #2 (marketplace-listing template + CMP-017 seed).
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const q = readQuery(params.q)
  const locale = await getStorefrontLocaleFromCookies()
  const page = Math.max(1, readNumber(params.page) ?? 1)
  const limit = 24
  const offset = (page - 1) * limit
  const { products, count } = await resolveListingProducts({
    locale,
    query: q || undefined,
    categorySlug: readQuery(params.categorie) || undefined,
    brand: readQuery(params.merk) || undefined,
    manufacturer: readQuery(params.manufacturer) || undefined,
    country: readQuery(params.country) || undefined,
    priceMin: readNumber(params.price_min),
    priceMax: readNumber(params.price_max),
    verified: readQuery(params.verified) === "true" ? true : undefined,
    sort: (readQuery(params.sort) as
      | "popularity"
      | "price_asc"
      | "price_desc"
      | "rating_desc"
      | "name_asc"
      | "name_desc") || "popularity",
    offset,
    limit,
  })
  const title = q
    ? tFormat("searchResultsTitleFor", locale, { query: q })
    : t("searchResultsTitle", locale)
  const meta = q
    ? tFormat("searchResultsForCount", locale, { count, query: q })
    : tFormat("searchResultsCount", locale, { count })

  return (
    <PublicStorefrontChrome searchQuery={q || undefined} locale={locale}>
      <div className="px-4 pt-[18px] tablet:px-8">
        <h1 className="m-0 text-[16px] font-bold text-wf-900 tablet:text-[22px]">
          {title}
        </h1>
        <p className="mt-1 text-[10.5px] text-wf-600 tablet:text-[12.5px]">{meta}</p>
        <Link
          href="/product-finder"
          className="mt-2 inline-flex rounded-md border border-wf-300 px-2.5 py-1 text-xs font-semibold text-wf-700"
        >
          {t("productFinderTitle", locale)}
        </Link>
      </div>
      <SearchResultsClient
        locale={locale}
        products={products}
        totalCount={count}
        page={page}
      />
    </PublicStorefrontChrome>
  )
}
