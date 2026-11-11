import { expandCategorySlugsWithDescendants } from "@europmade/utils"
import { CategoryPreviewClient } from "../../../_components/category/category-preview-client"
import { fetchLiveAdSlots } from "../../../_lib/advertising-live-slots"
import { fetchCategoryNav } from "../../../_lib/category-nav"
import { fetchStoreCmsBanners } from "../../../_lib/cms/fetch-store-cms"
import { getStorefrontLocaleFromCookies } from "../../../_lib/i18n/get-storefront-locale"
import { getStorefrontMarketFromRequest } from "../../../_lib/i18n/get-storefront-market"
import { fetchProductCloudCategoryBySlug, fetchStorefrontCategories } from "../../../_lib/product-cloud-store"
import { resolveAllCategoryProducts, resolveRelatedCategoryProducts } from "../../../_lib/storefront-catalog"
import { catalogCategoryFilterForSlug } from "../../../_lib/storefront-category"

export default async function CategoryPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [market, locale] = await Promise.all([
    getStorefrontMarketFromRequest(),
    getStorefrontLocaleFromCookies(),
  ])
  const tree = await fetchStorefrontCategories(locale)
  const categorySlug = tree
    ? expandCategorySlugsWithDescendants(catalogCategoryFilterForSlug(slug), tree)
    : catalogCategoryFilterForSlug(slug)
  const [slots, banners, listing, productCloud, nav] = await Promise.all([
    fetchLiveAdSlots("category", market, slug),
    fetchStoreCmsBanners({ market }),
    resolveAllCategoryProducts({ categorySlug, locale, market }),
    fetchProductCloudCategoryBySlug(slug, locale),
    fetchCategoryNav(locale),
  ])
  const related = await resolveRelatedCategoryProducts({
    sourceProducts: listing.products,
    locale,
    market,
  })
  return (
    <CategoryPreviewClient
      slug={slug}
      ads={{ campaign: slots[0] ?? null, banners }}
      products={listing.products}
      relatedProducts={related.products}
      productRelations={related.relations}
      filterAttributes={productCloud?.attributes ?? []}
      initialNav={nav}
    />
  )
}
