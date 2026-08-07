import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { CategoryPageView } from "../../_components/category/category-page-view"
import { resolveCategoryPage } from "../../_lib/cms/resolve-category"
import { resolveStorefrontLocaleFromCookie } from "../../_lib/cms/resolve-homepage"
import { LOCALE_COOKIE } from "../../_lib/i18n/locales"
import {
  findMarketplaceCategory,
  MARKETPLACE_CATEGORIES,
} from "../../_lib/marketplace-categories"
import {
  LISTING_PRODUCTS,
  productsForCategory,
} from "../../_lib/listing-products"
import { resolveListingProducts } from "../../_lib/storefront-catalog"

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
  const cookieStore = await cookies()
  const locale = resolveStorefrontLocaleFromCookie(
    cookieStore.get(LOCALE_COOKIE)?.value
  )
  const { products } = await resolveListingProducts({ categorySlug: slug })
  const pool =
    products.length > 0 ? products : productsForCategory(slug).length
      ? productsForCategory(slug)
      : LISTING_PRODUCTS.filter((p) => p.categorySlugs.includes(slug))
  const page = resolveCategoryPage(slug, pool, locale)
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

  const cookieStore = await cookies()
  const locale = resolveStorefrontLocaleFromCookie(
    cookieStore.get(LOCALE_COOKIE)?.value
  )

  const { products: apiProducts } = await resolveListingProducts({
    categorySlug: slug,
  })

  // Seed fallback for empty catalog (demo / offline) — seller images replace later.
  const seed = productsForCategory(slug)
  const products =
    apiProducts.length > 0
      ? apiProducts
      : seed.length > 0
        ? seed
        : LISTING_PRODUCTS.filter((p) => p.categorySlugs.includes(slug))

  const page = resolveCategoryPage(slug, products, locale)
  if (!page) notFound()

  return <CategoryPageView page={page} products={products} />
}
