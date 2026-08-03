import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MarketplaceListing } from "../../_components/marketplace/marketplace-listing"
import {
  findMarketplaceCategory,
  MARKETPLACE_CATEGORIES,
} from "../../_lib/marketplace-categories"

type CategoryPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return MARKETPLACE_CATEGORIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = findMarketplaceCategory(slug)
  if (!category) {
    return { title: "Categorie niet gevonden — EuropMade" }
  }
  return {
    title: `${category.label} — EuropMade`,
    description: `Ontdek producten in de categorie ${category.label} op EuropMade — geproduceerd in Europa.`,
    alternates: { canonical: `/categorie/${category.slug}` },
    openGraph: {
      title: `${category.label} — EuropMade`,
      description: `Categorie ${category.label} op de Europese marketplace EuropMade.`,
      locale: "nl_NL",
      type: "website",
    },
  }
}

/**
 * Categoriepagina — scherm #3/#4 (marketplace-listing template).
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const category = findMarketplaceCategory(slug)
  if (!category) notFound()

  return (
    <MarketplaceListing
      mode="category"
      title={category.label}
      meta="0 producten — catalogus volgt binnenkort"
      breadcrumbLabel={category.label}
      emptyVariant="catalog-pending"
      showCategoryAdSlot
    />
  )
}
