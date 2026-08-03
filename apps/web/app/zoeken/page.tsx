import type { Metadata } from "next"
import { MarketplaceListing } from "../_components/marketplace/marketplace-listing"

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
    alternates: { canonical: q ? `/zoeken?q=${encodeURIComponent(q)}` : "/zoeken" },
  }
}

/**
 * Zoekresultaten — scherm #2 (marketplace-listing template).
 * Productlisting wacht op Search/Catalog-API.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = readQuery((await searchParams).q)
  const title = q ? `Zoekresultaten voor “${q}”` : "Zoekresultaten"
  const meta = q
    ? `Zoekopdracht “${q}” — catalogus volgt binnenkort`
    : "Voer een zoekterm in via de zoekbalk — catalogus volgt binnenkort"

  return (
    <MarketplaceListing
      mode="search"
      title={title}
      meta={meta}
      emptyVariant="catalog-pending"
      searchQuery={q || undefined}
      showCategoryAdSlot={false}
    />
  )
}
