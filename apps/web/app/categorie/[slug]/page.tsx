import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CategoryPageView } from "../../_components/category/category-page-view"
import { resolveCategoryPage } from "../../_lib/cms/resolve-category"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import {
  findMarketplaceCategory,
  MARKETPLACE_CATEGORIES,
} from "../../_lib/marketplace-categories"
import {
  LISTING_PRODUCTS,
  productsForCategory,
} from "../../_lib/listing-products"
import { resolveListingProducts } from "../../_lib/storefront-catalog"
import { fetchProductCloudCategoryBySlug } from "../../_lib/product-cloud-store"

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
  const locale = await getStorefrontLocaleFromCookies()
  const { products } = await resolveListingProducts({
    categorySlug: slug,
    locale,
  })
  const pool =
    products.length > 0 ? products : productsForCategory(slug).length
      ? productsForCategory(slug)
      : LISTING_PRODUCTS.filter((p) => p.categorySlugs.includes(slug))
  const productCloud = await fetchProductCloudCategoryBySlug(slug, locale)
  const page = resolveCategoryPage(
    slug,
    pool,
    locale,
    undefined,
    new Date(),
    productCloud
  )
  if (!page) {
    return { title: "Category — EuropMade" }
  }
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: page.canonicalPath },
    openGraph: {
      title: page.openGraph.title,
      description: page.openGraph.description,
      locale: locale === "nl" ? "nl_NL" : locale,
      type: page.openGraph.type,
    },
    twitter: {
      card: page.twitterCard.card,
      title: page.twitterCard.title,
      description: page.twitterCard.description,
    },
  }
}

/**
 * Premium category page — CMS/AI-ready listing (scherm #3/#4).
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  if (!findMarketplaceCategory(slug)) notFound()

  const locale = await getStorefrontLocaleFromCookies()

  const { products: apiProducts } = await resolveListingProducts({
    categorySlug: slug,
    locale,
  })

  // Seed fallback for empty catalog (demo / offline) — seller images replace later.
  const seed = productsForCategory(slug)
  const products =
    apiProducts.length > 0
      ? apiProducts
      : seed.length > 0
        ? seed
        : LISTING_PRODUCTS.filter((p) => p.categorySlugs.includes(slug))

  const productCloud = await fetchProductCloudCategoryBySlug(slug, locale)
  const page = resolveCategoryPage(
    slug,
    products,
    locale,
    undefined,
    new Date(),
    productCloud
  )
  if (!page) notFound()

  return <CategoryPageView page={page} products={products} />
}
