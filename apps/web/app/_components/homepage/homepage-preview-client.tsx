"use client"

import { useEffect, useMemo, useState } from "react"
import type { HomepageCmsDocument } from "../../_lib/cms/homepage-cms"
import { resolveHomepageCms } from "../../_lib/cms/resolve-homepage"
import { mapApiBanners, resolveHomepageBannerOverrides } from "./homepage-shared"
import { HomepageView } from "./homepage-view"
import { fetchStorefrontListings } from "../../_lib/client-catalog"
import type { ListingProduct } from "../../_lib/listing-products"
import { DEFAULT_STOREFRONT_LOCALE, type StorefrontLocale } from "../../_lib/i18n/locales"
import { mergePaidHomepageBanners } from "../../_lib/cms/merge-paid-banners"
import type { LiveAdSlot } from "../../_lib/advertising-live-slots"
import { postPreviewSelect, useCmsPreviewHost } from "../../_lib/cms/use-cms-preview-host"
import type { StoreCmsBanner } from "../../_lib/cms/fetch-store-cms"
import { pickHomepageRailProducts } from "../../_lib/cms/homepage-product-rails"

function asLocale(value: string | undefined): StorefrontLocale {
  if (value === "en" || value === "de" || value === "fr" || value === "nl") {
    return value
  }
  return DEFAULT_STOREFRONT_LOCALE
}

export function HomepagePreviewClient() {
  const { draft, theme } = useCmsPreviewHost()
  const [products, setProducts] = useState<ListingProduct[]>([])

  useEffect(() => {
    fetchStorefrontListings(48).then(setProducts).catch(() => setProducts([]))
  }, [])

  const locale = asLocale(draft?.locale)
  const document = (draft?.document ?? null) as HomepageCmsDocument | null

  const cms = useMemo(() => {
    if (!document) return null
    const library = Array.isArray(draft?.banners)
      ? mapApiBanners(draft.banners as StoreCmsBanner[])
      : []
    const banners = resolveHomepageBannerOverrides({
      documentBanners: document.banners,
      libraryBanners: library,
    })
    const resolved = resolveHomepageCms(locale, document, new Date(), {
      bannerOverrides: banners,
    })
    const paid = Array.isArray(draft?.paidSlots)
      ? (draft.paidSlots as LiveAdSlot[])
      : []
    resolved.banners = mergePaidHomepageBanners(resolved.banners, paid, locale)
    return resolved
  }, [document, draft?.banners, draft?.paidSlots, locale])

  const featuredSection = cms?.sections.featured
  const newestSection = cms?.sections.newest
  const bestSection = cms?.sections.best_sellers

  const featuredIdsKey = (featuredSection?.productIds ?? []).join("|")
  const newestIdsKey = (newestSection?.productIds ?? []).join("|")
  const bestIdsKey = (bestSection?.productIds ?? []).join("|")

  const featuredProducts = useMemo(
    () => pickHomepageRailProducts(products, featuredSection, "offers", 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit sort/limit/ids keys
    [
      products,
      featuredSection?.sortMode,
      featuredSection?.sortSeed,
      featuredSection?.limit,
      featuredIdsKey,
    ]
  )
  const newest = useMemo(
    () => pickHomepageRailProducts(products, newestSection, "newest", 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      products,
      newestSection?.sortMode,
      newestSection?.sortSeed,
      newestSection?.limit,
      newestIdsKey,
    ]
  )
  const bestSold = useMemo(
    () => pickHomepageRailProducts(products, bestSection, "offers", 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      products,
      bestSection?.sortMode,
      bestSection?.sortSeed,
      bestSection?.limit,
      bestIdsKey,
    ]
  )

  if (!cms) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-wf-500">
        Wachten op CMS-concept…
      </div>
    )
  }

  return (
    <HomepageView
      cms={cms}
      featuredProducts={featuredProducts}
      newest={newest}
      bestSold={bestSold}
      locale={locale}
      preview={{
        selectedId: draft?.selectedId ?? "",
        interactive: true,
        honestEmpty: true,
        theme,
        onSelect: postPreviewSelect,
      }}
    />
  )
}
