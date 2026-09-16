import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { COMMERCIAL_NAV_GROUPS, isCommercialNavKey } from "@europmade/utils"
import { CategoryPageView } from "../../_components/category/category-page-view"
import { resolveCategoryPage } from "../../_lib/cms/resolve-category"
import { fetchStoreCmsCategory } from "../../_lib/cms/fetch-store-cms"
import { overlayCategoryEditorial } from "../../_lib/cms/overlay-category-editorial"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { MARKETPLACE_CATEGORIES } from "../../_lib/marketplace-categories"
import { resolveListingProducts } from "../../_lib/storefront-catalog"
import {
  catalogCategoryFilterForSlug,
  isCanonicalStorefrontCategory,
} from "../../_lib/storefront-category"
import {
  fetchCategoryRedirect,
  fetchProductCloudCategoryBySlug,
  fetchStorefrontCategories,
} from "../../_lib/product-cloud-store"

type CategoryPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = new Set(MARKETPLACE_CATEGORIES.map((c) => c.slug))
  const pc = await fetchStorefrontCategories("nl")
  for (const c of pc ?? []) {
    if (c.slug) slugs.add(c.slug)
  }
  for (const group of COMMERCIAL_NAV_GROUPS) slugs.add(group.key)
  return [...slugs].map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const productCloud = await fetchProductCloudCategoryBySlug(slug, locale)
  if (!isCanonicalStorefrontCategory(slug, productCloud)) {
    return { title: "Category — EuropMade" }
  }
  const { products } = await resolveListingProducts({
    categorySlug: catalogCategoryFilterForSlug(slug),
    locale,
  })
  const remoteCms = await fetchStoreCmsCategory(slug)
  const cmsDocument = overlayCategoryEditorial(
    slug,
    remoteCms?.category?.document ?? {}
  )
  const page = resolveCategoryPage(
    slug,
    products,
    locale,
    cmsDocument,
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
 * Categoriepagina — pc_category-slug of commerciële Fase-5-groep.
 * Listing filtert op gekoppelde Product Cloud-slugs. Geen seed-producten.
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const productCloud = await fetchProductCloudCategoryBySlug(slug, locale)
  if (
    !isCommercialNavKey(slug) &&
    (!productCloud || productCloud.slug !== slug)
  ) {
    const to = await fetchCategoryRedirect(slug)
    if (to) permanentRedirect(`/categorie/${to}`)
  }
  if (!isCanonicalStorefrontCategory(slug, productCloud)) notFound()

  const { products } = await resolveListingProducts({
    categorySlug: catalogCategoryFilterForSlug(slug),
    locale,
  })

  const remoteCms = await fetchStoreCmsCategory(slug)
  const cmsDocument = overlayCategoryEditorial(
    slug,
    remoteCms?.category?.document ?? {}
  )

  const page = resolveCategoryPage(
    slug,
    products,
    locale,
    cmsDocument,
    new Date(),
    productCloud
  )
  if (!page) notFound()

  return <CategoryPageView page={page} products={products} />
}
