import type { Metadata } from "next"
import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import {
  COMMERCIAL_NAV_GROUPS,
  categoryListingQueryFromSearch,
  expandCategorySlugsWithDescendants,
  isCommercialNavKey,
  selectCategoryShelf,
  testCatalogProductInCategory,
} from "@europmade/utils"
import {
  categoryProfileFromDepth,
  categoryV2StorefrontDocument,
  type CategoryCmsDocumentV2,
} from "@europmade/utils"
import { CategoryPageView } from "../../_components/category/category-page-view"
import { CategoryV2Page } from "../../_components/category/category-v2-page"
import { fetchLiveAdSlots } from "../../_lib/advertising-live-slots"
import { resolveCategoryPage } from "../../_lib/cms/resolve-category"
import { fetchStoreCmsBanners, fetchStoreCmsCategory } from "../../_lib/cms/fetch-store-cms"
import { getStorefrontMarketFromRequest } from "../../_lib/i18n/get-storefront-market"
import { overlayCategoryEditorial } from "../../_lib/cms/overlay-category-editorial"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { MARKETPLACE_CATEGORIES } from "../../_lib/marketplace-categories"
import {
  mergeTestCatalogProducts,
  resolveAllCategoryProducts,
  resolveCategoryShelfOffers,
  resolveListingProducts,
  resolveRelatedCategoryProducts,
  resolveTestCatalogProducts,
} from "../../_lib/storefront-catalog"
import { fetchCategoryNav } from "../../_lib/category-nav"
import { storedCategoryTileUrl } from "../../_lib/category-tile-files"
import type { ListingProduct } from "../../_lib/listing-products"
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>
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

async function listingFilterForSlug(slug: string, locale: Awaited<ReturnType<typeof getStorefrontLocaleFromCookies>>) {
  const base = catalogCategoryFilterForSlug(slug)
  const tree = await fetchStorefrontCategories(locale)
  if (!tree) return base
  return expandCategorySlugsWithDescendants(base, tree)
}

function withVisibleProductShelf(document: CategoryCmsDocumentV2): CategoryCmsDocumentV2 {
  if (document.blocks.some((block) => block.type === "product_carousel" || block.type === "product_grid")) {
    return document
  }
  const shelf = {
    id: `${document.profile}-product_carousel`,
    type: "product_carousel" as const,
    visible: true,
    title: { nl: "", en: "", de: "", fr: "" },
    sort: "relevance" as const,
    limit: 15,
  }
  const blocks = [...document.blocks]
  const tiles = blocks.findIndex((block) => block.type === "product_group_tiles" || block.type === "subcategory_tiles")
  blocks.splice(tiles >= 0 ? tiles + 1 : blocks.length, 0, shelf)
  return { ...document, blocks }
}

const loadProductCloudCategory = cache(fetchProductCloudCategoryBySlug)
const loadCategoryNav = cache(fetchCategoryNav)
const loadStoreCmsCategory = cache(fetchStoreCmsCategory)
const loadTestCatalog = cache(resolveTestCatalogProducts)
const loadListingFilter = cache(listingFilterForSlug)

function descendantSlugs(
  rootId: string,
  rows: Array<{ id: string; slug: string; parent_category_id: string | null }>
): Set<string> {
  const childrenByParent = new Map<string, string[]>()
  const byId = new Map(rows.map((row) => [row.id, row]))
  for (const row of rows) {
    if (!row.parent_category_id) continue
    const list = childrenByParent.get(row.parent_category_id) ?? []
    list.push(row.id)
    childrenByParent.set(row.parent_category_id, list)
  }
  const slugs = new Set<string>()
  const stack = [rootId]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const id = stack.pop()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const row = byId.get(id)
    if (row?.slug) slugs.add(row.slug.trim().toLowerCase())
    for (const childId of childrenByParent.get(id) ?? []) stack.push(childId)
  }
  return slugs
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const productCloud = await loadProductCloudCategory(slug, locale)
  if (!isCanonicalStorefrontCategory(slug, productCloud)) {
    return { title: "Category — EuropMade" }
  }
  const categorySlug = await loadListingFilter(slug, locale)
  const testCatalog = await loadTestCatalog(locale)
  const showsTestCatalog = testCatalog.some((product) =>
    testCatalogProductInCategory(product.categorySlugs, categorySlug)
  )
  const remoteCms = await loadStoreCmsCategory(slug)
  const cmsDocument = overlayCategoryEditorial(
    slug,
    remoteCms?.category?.document ?? {}
  )
  const page = resolveCategoryPage(
    slug,
    [],
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
    ...(showsTestCatalog ? { robots: { index: false, follow: false } } : {}),
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
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const listingQuery = categoryListingQueryFromSearch((await searchParams) ?? {})
  const locale = await getStorefrontLocaleFromCookies()
  if (!isCommercialNavKey(slug)) {
    const to = await fetchCategoryRedirect(slug)
    if (to) permanentRedirect(`/categorie/${to}`)
  }
  const productCloud = await loadProductCloudCategory(slug, locale)
  if (!isCanonicalStorefrontCategory(slug, productCloud)) notFound()

  const nav = await loadCategoryNav(locale)
  const self = nav.find((row) => row.slug === slug) ?? null
  const testCatalog = await loadTestCatalog(locale)
  const subcategories = self
    ? nav.filter((row) => row.parent_category_id === self.id)
    : []

  const byId = new Map(nav.map((row) => [row.id, row]))
  const seen = new Set<string>()
  const chain = []
  let cursor = self
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    chain.unshift(cursor)
    cursor = cursor.parent_category_id ? byId.get(cursor.parent_category_id) : undefined
  }
  const profile = categoryProfileFromDepth(chain.length)
  const categorySlug = await loadListingFilter(slug, locale)
  const { products: publishedProducts } = await resolveAllCategoryProducts({ categorySlug, locale })
  const products = mergeTestCatalogProducts(
    publishedProducts,
    testCatalog.filter((product) => testCatalogProductInCategory(product.categorySlugs, categorySlug))
  )
  const alternatives =
    publishedProducts.length === 0 && !profile
      ? (await resolveListingProducts({ locale, limit: 4 })).products
      : []

  const remoteCms = await loadStoreCmsCategory(slug)
  const cmsDocument = overlayCategoryEditorial(
    slug,
    remoteCms?.category?.document ?? {}
  )

  const page = resolveCategoryPage(
    slug,
    publishedProducts,
    locale,
    cmsDocument,
    new Date(),
    productCloud
  )
  if (!page) notFound()

  const published = remoteCms?.category?.document
  const v2: CategoryCmsDocumentV2 | null = profile
    ? categoryV2StorefrontDocument(published, profile, slug)
    : null

  if (profile && v2) {
    const market = await getStorefrontMarketFromRequest()
    const shelfOffers = await resolveCategoryShelfOffers(
      selectCategoryShelf(publishedProducts, slug, 15).map((product) => product.slug),
      market
    )
    const shelfProducts = products.map((product) => {
      const offer = shelfOffers.get(product.slug)
      if (!offer) return product
      return {
        ...product,
        priceCents: offer.priceCents,
        regularPriceCents: offer.regularPriceCents,
        reviewCount: offer.reviewCount,
        rating: offer.rating ?? 0,
        buyBoxOfferId: offer.offerId,
        buyBoxSellerId: offer.sellerId,
        buyBoxSellerName: offer.sellerName,
      }
    })
    const [slots, banners, related] = await Promise.all([
      fetchLiveAdSlots("category", market, categorySlug),
      fetchStoreCmsBanners({ market }),
      resolveRelatedCategoryProducts({ sourceProducts: publishedProducts, locale, market }),
    ])
    return (
      <CategoryV2Page
        document={withVisibleProductShelf(v2)}
        locale={locale}
        categoryName={self?.name || productCloud?.name || page.h1}
        breadcrumbs={chain.map((row) => ({ href: `/categorie/${row.slug}`, label: row.name }))}
        children={subcategories.map((row) => {
          const slugs = descendantSlugs(row.id, nav)
          let sellableCount = 0
          let testCount = 0
          for (const product of products) {
            const hit = product.categorySlugs.some((value) => slugs.has(value.trim().toLowerCase()))
            if (!hit) continue
            if (product.offerCount > 0 && product.priceCents > 0) sellableCount += 1
            else if (product.testCatalog) testCount += 1
          }
          return {
            slug: row.slug,
            name: row.name,
            productCount: row.product_count,
            sellableCount,
            testCount,
            imageUrl: storedCategoryTileUrl(row.slug),
          }
        })}
        products={shelfProducts}
        relatedProducts={related.products}
        productRelations={related.relations}
        filterAttributes={productCloud?.attributes ?? []}
        ads={{ campaign: slots[0] ?? null, banners }}
        listingQuery={listingQuery}
      />
    )
  }

  return (
    <CategoryPageView
      page={page}
      products={publishedProducts}
      alternatives={alternatives}
      subcategories={subcategories
        .filter((row) => row.product_count > 0)
        .map((row) => ({
          slug: row.slug,
          name: row.name,
          product_count: row.product_count,
        }))}
    />
  )
}
