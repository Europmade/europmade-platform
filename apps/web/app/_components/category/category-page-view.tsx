"use client"

import type { ListingProduct } from "../../_lib/listing-products"
import type { ResolvedCategoryPage } from "../../_lib/cms/resolve-category"
import { CATEGORY_PRODUCT_KIND } from "../../_lib/product-mockup"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"
import { CategoryHero } from "./category-hero"
import { CategoryExperience } from "./category-experience"
import { CommercialNavVisitBeacon } from "../../_lib/commercial-nav-visit"

type CategoryPageViewProps = {
  page: ResolvedCategoryPage
  products: ListingProduct[]
  alternatives?: ListingProduct[]
}

/**
 * Premium category page shell — interactive guide + CMS content (no AI on load).
 */
export function CategoryPageView({
  page,
  products,
  alternatives = [],
}: CategoryPageViewProps) {
  const productKind = CATEGORY_PRODUCT_KIND[page.slug] ?? "coffee"

  return (
    <PublicStorefrontChrome locale={page.locale}>
      <CommercialNavVisitBeacon categoryKey={page.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(page.structuredData),
        }}
      />

      <CategoryHero
        locale={page.locale}
        title={page.h1}
        intro={page.intro}
        stats={page.stats}
        banner={page.banner}
        bannerPriority={page.bannerPriority}
        breadcrumbLabel={page.title}
        productKind={productKind}
      />

      <CategoryExperience page={page} products={products} alternatives={alternatives} />
    </PublicStorefrontChrome>
  )
}
