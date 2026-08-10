"use client"

import { useCallback, useMemo, useState } from "react"
import type { ListingProduct } from "../../_lib/listing-products"
import { t } from "../../_lib/i18n/messages"
import type { ResolvedCategoryPage } from "../../_lib/cms/resolve-category"
import {
  getUltimateGuide,
  pickTopProducts,
  personaStrategy,
  type GuidePickStrategy,
  type TopListDef,
} from "../../_lib/category/ultimate-guide"
import type { CategorySortKey } from "../../_lib/category-listing"
import { CategoryListingClient } from "./category-listing-client"
import { CategoryDynamicBlocks } from "./category-dynamic-blocks"
import { CategoryBuyGuide } from "./category-buy-guide"
import { CategoryDiscovery } from "./category-discovery"
import { CategoryFaq } from "./category-faq"

export type GuideActionPayload = {
  filterIds?: string[]
  sort?: CategorySortKey
  strategy?: GuidePickStrategy
  label?: string
  scrollToResults?: boolean
}

type CategoryExperienceProps = {
  page: ResolvedCategoryPage
  products: ListingProduct[]
}

/**
 * Client shell — shared filters/sort between toplists, personas and listing.
 */
export function CategoryExperience({ page, products }: CategoryExperienceProps) {
  const guide = useMemo(
    () => getUltimateGuide(page.slug, page.title, page.locale),
    [page.slug, page.title, page.locale]
  )

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<CategorySortKey>("popularity")
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [activePickLabel, setActivePickLabel] = useState<string | null>(null)
  const [top3, setTop3] = useState<ListingProduct[]>([])
  const [openAttrId, setOpenAttrId] = useState<string | null>(null)
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null)

  const applyGuideAction = useCallback(
    (payload: GuideActionPayload) => {
      const ids = payload.filterIds?.filter(Boolean) ?? []
      if (ids.length > 0) {
        setActiveFilters(new Set(ids))
      }
      if (payload.sort) setSort(payload.sort)
      const strategy = payload.strategy ?? "best"
      const picks = pickTopProducts(products, strategy, 3)
      setTop3(picks)
      setActivePickLabel(payload.label ?? guide.top3Heading)
      if (payload.scrollToResults !== false) {
        requestAnimationFrame(() => {
          document
            .getElementById("category-results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      }
    },
    [products, guide.top3Heading]
  )

  const onTopList = useCallback(
    (list: TopListDef) => {
      applyGuideAction({
        filterIds: list.filterIds,
        sort: list.sort,
        strategy: list.strategy,
        label: `${list.emoji} ${list.title}`,
      })
    },
    [applyGuideAction]
  )

  const onPersona = useCallback(
    (personaId: string, title: string) => {
      applyGuideAction({
        strategy: personaStrategy(personaId),
        sort:
          personaId === "budget" || personaId === "student"
            ? "price-asc"
            : personaId === "premium" || personaId === "pro"
              ? "price-desc"
              : "rating",
        label: title,
      })
    },
    [applyGuideAction]
  )

  return (
    <>
      <CategoryListingClient
        locale={page.locale}
        products={products}
        filterGroups={page.filterGroups}
        countries={page.countries}
        categoryLabel={page.title}
        controlled={{
          activeFilters,
          setActiveFilters,
          sort,
          setSort,
          selectedCountry,
          setSelectedCountry,
        }}
        topLists={guide.topLists}
        topListsHeading={guide.topListsHeading}
        onTopList={onTopList}
        highlightProducts={top3}
        highlightLabel={activePickLabel}
        top3Heading={guide.top3Heading}
      />

      <CategoryDynamicBlocks
        blocks={page.dynamicBlocks}
        locale={page.locale}
      />

      <CategoryBuyGuide
        title={t("buyGuideHeading", page.locale)}
        categorySlug={page.slug}
        categoryLabel={page.title}
        locale={page.locale}
        blocks={page.editorialBlocks}
        insights={page.productCloudInsights}
        insightsTitle={t("productInsightsHeading", page.locale)}
        products={products}
        guide={guide}
        openAttrId={openAttrId}
        setOpenAttrId={setOpenAttrId}
        openQuestionId={openQuestionId}
        setOpenQuestionId={setOpenQuestionId}
        onPersona={onPersona}
        onApplyFilters={(filterIds, label) =>
          applyGuideAction({
            filterIds,
            strategy: "best",
            label,
          })
        }
      />

      <CategoryDiscovery
        title={t("internalLinksHeading", page.locale)}
        productsSuffix={t("productsSuffix", page.locale)}
        categorySlug={page.slug}
        categoryLabel={page.title}
        locale={page.locale}
        rails={page.discoveryRails}
        cards={page.discoveryCards}
      />

      <CategoryFaq
        title={t("faqHeading", page.locale)}
        items={page.faq}
        categorySlug={page.slug}
        categoryLabel={page.title}
        locale={page.locale}
        guideFaq={guide.faq}
      />
    </>
  )
}
