"use client"

import type { ListingProduct } from "../../_lib/listing-products"
import type { ResolvedCategoryPage } from "../../_lib/cms/resolve-category"
import { CATEGORY_PRODUCT_KIND } from "../../_lib/product-mockup"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"
import { CategoryHero } from "./category-hero"
import { CategoryExperience } from "./category-experience"
import { CommercialNavVisitBeacon } from "../../_lib/commercial-nav-visit"
import Link from "next/link"
import { t, tFormat } from "../../_lib/i18n/messages"

type CategoryPageViewProps = {
  page: ResolvedCategoryPage
  products: ListingProduct[]
  alternatives?: ListingProduct[]
  subcategories?: Array<{ slug: string; name: string; product_count: number }>
}

/**
 * Premium category page shell — interactive guide + CMS content (no AI on load).
 */
export function CategoryPageView({
  page,
  products,
  alternatives = [],
  subcategories = [],
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

      {subcategories.length > 0 ? (
        <nav
          aria-label={t("navOpenSubcategories", page.locale)}
          className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-2 px-4"
        >
          {subcategories.map((child) => (
            <Link
              key={child.slug}
              href={`/categorie/${child.slug}`}
              className="rounded border border-wf-300 bg-white px-3 py-1.5 text-xs font-semibold text-wf-800 hover:underline"
            >
              {child.name}
              <span className="ml-1 font-normal text-wf-500">
                {tFormat("navProductCount", page.locale, {
                  count: child.product_count,
                })}
              </span>
            </Link>
          ))}
        </nav>
      ) : null}

      <CategoryExperience page={page} products={products} alternatives={alternatives} />
    </PublicStorefrontChrome>
  )
}
