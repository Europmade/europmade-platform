"use client"

import { useEffect, useMemo, useState } from "react"
import { overlayCategoryEditorial } from "../../_lib/cms/overlay-category-editorial"
import { resolveCategoryPage } from "../../_lib/cms/resolve-category"
import {
  fetchPreviewProductCloudCategory,
  fetchStorefrontListings,
} from "../../_lib/client-catalog"
import type { ProductCloudStoreCategory } from "../../_lib/product-cloud-store"
import type { ListingProduct } from "../../_lib/listing-products"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { CategoryPageView } from "../category/category-page-view"
import { CmsThemeStyle } from "../cms/cms-theme-style"
import {
  postPreviewSelect,
  useCmsPreviewHost,
} from "../../_lib/cms/use-cms-preview-host"

function asLocale(value: string | undefined): StorefrontLocale {
  if (value === "en" || value === "de" || value === "fr" || value === "nl") {
    return value
  }
  return DEFAULT_STOREFRONT_LOCALE
}

export function CategoryPreviewClient({ slug }: { slug: string }) {
  const { draft, theme } = useCmsPreviewHost()
  const [products, setProducts] = useState<ListingProduct[]>([])
  const [productCloud, setProductCloud] = useState<ProductCloudStoreCategory | null>(
    null
  )

  useEffect(() => {
    fetchStorefrontListings(40)
      .then((all) =>
        all.filter((p) =>
          p.categorySlugs.some(
            (s) => s === slug || s.includes(slug) || slug.includes(s)
          )
        )
      )
      .then((filtered) => setProducts(filtered.length ? filtered : []))
      .catch(() => setProducts([]))
  }, [slug])

  const locale = asLocale(draft?.locale)

  useEffect(() => {
    fetchPreviewProductCloudCategory(slug, locale)
      .then(setProductCloud)
      .catch(() => setProductCloud(null))
  }, [locale, slug])
  const page = useMemo(() => {
    const editorial = overlayCategoryEditorial(slug, draft?.document ?? {})
    return resolveCategoryPage(
      slug,
      products,
      locale,
      editorial,
      new Date(),
      productCloud
    )
  }, [draft?.document, locale, productCloud, products, slug])

  if (!page) {
    return (
      <div className="p-8 text-sm text-wf-500">Categorie niet gevonden.</div>
    )
  }

  return (
    <div
      className="em-cms-theme"
      onClick={(e) => {
        const el = (e.target as HTMLElement).closest("[data-cms-section]")
        if (el instanceof HTMLElement && el.dataset.cmsSection) {
          postPreviewSelect(el.dataset.cmsSection)
        }
      }}
    >
      <CmsThemeStyle theme={theme} />
      {products.length === 0 ? (
        <p className="border-b border-wf-100 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
          Geen Product Cloud-producten beschikbaar voor deze categorie.
        </p>
      ) : null}
      <CategoryPageView page={page} products={products} />
      {draft?.selectedId ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-cms-section="${draft.selectedId}"]{outline:2px solid #38bdf8;outline-offset:-2px;}`,
          }}
        />
      ) : null}
    </div>
  )
}
