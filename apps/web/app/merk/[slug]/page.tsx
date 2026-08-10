import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MarketplaceListing } from "../../_components/marketplace/marketplace-listing"
import {
  findBrandProfile,
  listBrandProfiles,
} from "../../_lib/brand-profiles"
import { slugifyForBrand } from "../../_lib/brand-slug"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { resolveListingProducts } from "../../_lib/storefront-catalog"

type MerkPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return listBrandProfiles().map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({
  params,
}: MerkPageProps): Promise<Metadata> {
  const { slug } = await params
  const brand = findBrandProfile(slug)
  if (!brand) return { title: "Merk niet gevonden — EuropMade" }
  return {
    title: `${brand.name} — EuropMade`,
    description: brand.description,
    alternates: { canonical: `/merk/${brand.slug}` },
  }
}

/**
 * Merkpagina (#19) — hergebruikt MarketplaceListing + ProductCard.
 */
export default async function MerkPage({ params }: MerkPageProps) {
  const { slug } = await params
  const brand = findBrandProfile(slug)
  const locale = await getStorefrontLocaleFromCookies()
  const { products: allProducts } = await resolveListingProducts({ locale })
  const products = allProducts.filter((p) => slugifyForBrand(p.brand) === slug)
  if (!brand && products.length === 0) notFound()

  const title = brand?.name ?? products[0]?.brand ?? slug
  const metaPrefix = brand?.meta ? `${brand.meta} · ` : ""

  return (
    <MarketplaceListing
      mode="category"
      title={title}
      meta={`${products.length} producten · ${metaPrefix}Merkpagina`}
      breadcrumbLabel={title}
      emptyVariant="category"
      products={products}
      locale={locale}
    />
  )
}
