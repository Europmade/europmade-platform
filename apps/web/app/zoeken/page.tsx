import type { Metadata } from "next"
import { MarketplaceListing } from "../_components/marketplace/marketplace-listing"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { resolveListingProducts } from "../_lib/storefront-catalog"

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>
}

function readQuery(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? ""
  return value?.trim() ?? ""
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const q = readQuery((await searchParams).q)
  const title = q
    ? `Zoekresultaten voor “${q}” — EuropMade`
    : "Zoeken — EuropMade"
  return {
    title,
    description:
      "Zoek naar Europese producten, merken en categorieën op EuropMade.",
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
  const q = readQuery((await searchParams).q)
  const locale = await getStorefrontLocaleFromCookies()
  const { products } = await resolveListingProducts({ query: q, locale })
  const title = q ? `Zoekresultaten voor “${q}”` : "Zoekresultaten"
  const meta = q
    ? `${products.length} producten voor “${q}”`
    : `${products.length} producten — verfijnen via filters of zoekterm`

  return (
    <MarketplaceListing
      mode="search"
      title={title}
      meta={meta}
      emptyVariant="search"
      searchQuery={q || undefined}
      showCategoryAdSlot={false}
      products={products}
      locale={locale}
    />
  )
}
