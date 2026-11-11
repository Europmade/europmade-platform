"use client"

import { useEffect, useMemo, useState } from "react"
import { overlayCategoryEditorial } from "../../_lib/cms/overlay-category-editorial"
import { resolveCategoryPage } from "../../_lib/cms/resolve-category"
import { fetchPreviewProductCloudCategory } from "../../_lib/client-catalog"
import type {
  ProductCloudStoreAttribute,
  ProductCloudStoreCategory,
} from "../../_lib/product-cloud-store"
import type { ListingProduct } from "../../_lib/listing-products"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { CategoryPageView } from "../category/category-page-view"
import { CategoryV2Page, type CategoryV2Ads } from "../category/category-v2-page"
import { fetchCategoryNav, type CategoryNavRow } from "../../_lib/category-nav"
import {
  categoryV2PreviewDocument,
  conceptPreviewPriceCents,
  conceptPreviewSpecs,
  isCmsPreviewAdminOrigin,
  mergeDraftPreviewProducts,
  resolveMediaUrl,
  type CategoryPreviewConceptProduct,
  type CategoryProductRelation,
} from "@europmade/utils"
import { CmsThemeStyle } from "../cms/cms-theme-style"
import {
  postPreviewSelect,
  useCmsPreviewHost,
} from "../../_lib/cms/use-cms-preview-host"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"
import { t } from "../../_lib/i18n/messages"

function conceptListingProduct(
  product: CategoryPreviewConceptProduct,
  locale: StorefrontLocale,
  categorySlug: string
): ListingProduct {
  return {
    slug: product.id,
    title: product.title,
    brand: product.brand_name?.trim() || "",
    seller: t("noSellersYet", locale),
    categorySlugs: product.category_slugs?.length ? product.category_slugs : [categorySlug],
    priceCents: conceptPreviewPriceCents(product.from_price),
    offerCount: 0,
    rating: 0,
    countryCode: "",
    countryLabel: "",
    verified: false,
    features: [],
    keywords: [product.title, product.brand_name ?? ""].filter(Boolean),
    imageUrl: resolveMediaUrl(product.image_url, medusaBackendUrl()),
    imageUrls: (product.image_urls ?? []).flatMap((url) => {
      const resolved = resolveMediaUrl(url, medusaBackendUrl())
      return resolved ? [resolved] : []
    }),
    specs: conceptPreviewSpecs(product.attributes),
    previewStatus: "concept",
  }
}

function asLocale(value: string | undefined): StorefrontLocale {
  if (value === "en" || value === "de" || value === "fr" || value === "nl") {
    return value
  }
  return DEFAULT_STOREFRONT_LOCALE
}

export function CategoryPreviewClient({
  slug,
  ads,
  products,
  relatedProducts,
  productRelations,
  filterAttributes,
  initialNav,
}: {
  slug: string
  ads: CategoryV2Ads
  products: ListingProduct[]
  relatedProducts: ListingProduct[]
  productRelations: CategoryProductRelation[]
  filterAttributes: ProductCloudStoreAttribute[]
  initialNav: CategoryNavRow[]
}) {
  const { draft, draftOrigin, theme } = useCmsPreviewHost()
  const [nav, setNav] = useState<CategoryNavRow[]>(initialNav)
  const [productCloud, setProductCloud] = useState<ProductCloudStoreCategory | null>(
    null
  )

  const locale = asLocale(draft?.locale)
  const previewProducts = useMemo(() => {
    const extra = draft?.previewProducts
    if (!extra || !draftOrigin || !isCmsPreviewAdminOrigin(draftOrigin)) return products
    return mergeDraftPreviewProducts(
      products,
      extra
        .filter((product) => product.publication_status === "Concept")
        .map((product) => conceptListingProduct(product, locale, slug))
    )
  }, [draft?.previewProducts, draftOrigin, locale, products, slug])

  useEffect(() => {
    let cancelled = false
    fetchPreviewProductCloudCategory(slug, locale)
      .then((cloud) => {
        if (!cancelled) setProductCloud(cloud)
      })
      .catch(() => {
        if (!cancelled) setProductCloud(null)
      })
    fetchCategoryNav(locale)
      .then((rows) => {
        if (!cancelled && rows.length > 0) setNav(rows)
      })
      .catch(() => {
        if (!cancelled) setNav(initialNav)
      })
    return () => {
      cancelled = true
    }
  }, [initialNav, locale, slug])
  const page = useMemo(() => {
    const editorial = overlayCategoryEditorial(slug, draft?.document ?? {})
    return resolveCategoryPage(
      slug,
      previewProducts,
      locale,
      editorial,
      new Date(),
      productCloud
    )
  }, [draft?.document, locale, previewProducts, productCloud, slug])

  const v2 = categoryV2PreviewDocument(draft?.document)
  const self = nav.find((row) => row.slug === slug) ?? null
  const children = self
    ? nav
        .filter((row) => row.parent_category_id === self.id)
        .map((row) => ({ slug: row.slug, name: row.name, productCount: row.product_count }))
    : []
  const crumbs: { href: string; label: string }[] = []
  const byId = new Map(nav.map((row) => [row.id, row]))
  const seen = new Set<string>()
  let cursor = self
  const chain: CategoryNavRow[] = []
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    chain.unshift(cursor)
    cursor = cursor.parent_category_id ? byId.get(cursor.parent_category_id) : undefined
  }
  for (const row of chain) crumbs.push({ href: `/categorie/${row.slug}`, label: row.name })

  if (!page && !v2) {
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
      {v2 ? (
        <CategoryV2Page
          document={v2}
          locale={locale}
          categoryName={self?.name || productCloud?.name || slug}
          breadcrumbs={crumbs}
          children={children}
          products={previewProducts}
          relatedProducts={relatedProducts}
          productRelations={productRelations}
          filterAttributes={productCloud?.attributes ?? filterAttributes}
          ads={ads}
          preview
        />
      ) : page ? (
        <CategoryPageView page={page} products={previewProducts} />
      ) : null}
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
