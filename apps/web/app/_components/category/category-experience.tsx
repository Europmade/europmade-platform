"use client"

import { useMemo, useState } from "react"
import type { ListingProduct } from "../../_lib/listing-products"
import { t } from "../../_lib/i18n/messages"
import type { ResolvedCategoryPage } from "../../_lib/cms/resolve-category"
import type { CategorySortKey } from "../../_lib/category-listing"
import { CategoryListingClient } from "./category-listing-client"
import { CategoryDynamicBlocks } from "./category-dynamic-blocks"
import { CategoryDiscovery } from "./category-discovery"
import { CategoryFaq } from "./category-faq"

type CategoryExperienceProps = {
  page: ResolvedCategoryPage
  products: ListingProduct[]
  alternatives?: ListingProduct[]
}

/**
 * Category listing + optional CMS blocks. No synthetic buying-guide layer.
 */
export function CategoryExperience({
  page,
  products,
  alternatives = [],
}: CategoryExperienceProps) {
  const initialSort = useMemo((): CategorySortKey => {
    const sort = page.listingPresentation?.sort
    if (sort === "price_asc") return "price-asc"
    if (sort === "price_desc") return "price-desc"
    if (sort === "newest") return "rating"
    return "popularity"
  }, [page.listingPresentation?.sort])

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<CategorySortKey>(initialSort)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const listingTitle =
    page.listingPresentation?.title?.trim() || page.title

  const hasCmsDiscovery =
    page.discoveryRails.length > 0 || page.discoveryCards.length > 0
  const hasCmsFaq = page.faq.length > 0

  return (
    <>
      <CategoryListingClient
        locale={page.locale}
        products={products}
        filterGroups={page.filterGroups}
        countries={page.countries}
        categoryLabel={listingTitle}
        alternatives={alternatives}
        controlled={{
          activeFilters,
          setActiveFilters,
          sort,
          setSort,
          selectedCountry,
          setSelectedCountry,
        }}
      />

      <CategoryDynamicBlocks
        blocks={page.dynamicBlocks}
        locale={page.locale}
      />

      {hasCmsDiscovery ? (
        <CategoryDiscovery
          title={t("internalLinksHeading", page.locale)}
          productsSuffix={t("productsSuffix", page.locale)}
          categorySlug={page.slug}
          categoryLabel={page.title}
          locale={page.locale}
          rails={page.discoveryRails}
          cards={page.discoveryCards}
        />
      ) : null}

      {page.usps.length > 0 ? (
        <section
          className="px-4 pb-2 pt-1 tablet:px-8"
          data-cms-section="usps"
        >
          <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-2 desktop:grid-cols-3">
            {page.usps.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-wf-200 bg-white px-3 py-2.5 shadow-sm"
              >
                {item.title ? (
                  <h2 className="text-[13px] font-bold text-wf-900">{item.title}</h2>
                ) : null}
                {item.body ? (
                  <p className="mt-1 text-[12.5px] leading-snug text-wf-600">{item.body}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasCmsFaq ? (
        <CategoryFaq
          title={t("faqHeading", page.locale)}
          items={page.faq}
          categorySlug={page.slug}
          categoryLabel={page.title}
          locale={page.locale}
        />
      ) : null}
    </>
  )
}
