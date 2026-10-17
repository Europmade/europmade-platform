/**
 * Browser-safe catalog helpers (no Next.js `next.revalidate` options).
 */

import type { ListingProduct } from "./listing-products"
import type { CartLineMeta } from "./cart-line-meta"
import { hashHue, rememberCartLineMeta } from "./cart-line-meta"
import { resolveOfferDeliveryLabel } from "./offer-delivery"
import type { StorefrontLocale } from "./i18n/locales"
import { readLocaleFromBrowser } from "./i18n/use-storefront-locale"
import { t } from "./i18n/messages"
import { resolveMediaUrl } from "@europmade/utils"
import { medusaBackendUrl } from "./medusa-backend-url"
import type { ProductCloudStoreCategory } from "./product-cloud-store"

function browserStorefrontLocale(): StorefrontLocale {
  return readLocaleFromBrowser()
}

function browserStorefrontMarket(): string {
  if (typeof document === "undefined") return "NL"
  const match = document.cookie.match(/(?:^|; )em_storefront_market=([^;]*)/)
  const code = decodeURIComponent(match?.[1] ?? "").trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : "NL"
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type CatalogListProduct = {
  id: string
  title: string
  brand_name: string | null
  category_names: string[]
  country_code: string | null
  offer_count: number
  from_price: number | null
  average_review_score: number | null
  image_url?: string | null
}

type CatalogOffer = {
  offer_id: string
  seller_id: string
  seller_name: string
  quantity_available: number
  shipping_cost: number
}

async function catalogFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${medusaBackendUrl()}${path}`, {
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
    },
    signal,
  })
  if (!response.ok) throw new Error("Catalog fetch failed")
  return response.json() as Promise<T>
}

export type StorefrontSearchSuggestion = {
  id: string
  title: string
  brand: string
  imageUrl: string | null
}

export async function suggestStorefrontSearch(
  q: string,
  opts?: { limit?: number; signal?: AbortSignal }
): Promise<StorefrontSearchSuggestion[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const limit = Math.min(8, Math.max(1, opts?.limit ?? 6))
  const qs = new URLSearchParams()
  qs.set("q", query)
  qs.set("limit", String(limit))
  qs.set("region_code", browserStorefrontMarket())
  const response = await fetch(`/api/catalog/suggest?${qs}`, {
    signal: opts?.signal,
    credentials: "same-origin",
  })
  if (!response.ok) throw new Error("Catalog fetch failed")
  const res = (await response.json()) as {
    products?: StorefrontSearchSuggestion[]
  }
  return (res.products ?? []).slice(0, limit)
}

function toListing(item: CatalogListProduct): ListingProduct {
  const countryCode = (item.country_code ?? "EU").toUpperCase()
  const priceEuros = item.from_price ?? 0
  return {
    slug: item.id,
    title: item.title,
    brand: item.brand_name ?? "Merk",
    seller:
      item.offer_count > 0
        ? `${item.offer_count} aanbieder${item.offer_count === 1 ? "" : "s"}`
        : "Nog geen aanbieders",
    categorySlugs: item.category_names.length
      ? item.category_names.map((c) => c.toLowerCase().replace(/\s+/g, "-"))
      : ["algemeen"],
    priceCents: Math.round(priceEuros * 100),
    offerCount: item.offer_count,
    rating: item.average_review_score ?? 0,
    countryCode,
    countryLabel: countryCode,
    verified: true,
    features: item.category_names.slice(0, 2),
    keywords: [item.title, item.brand_name ?? ""].filter(Boolean),
    imageUrl: resolveMediaUrl(item.image_url ?? null, medusaBackendUrl()),
  }
}

export async function fetchPreviewProductCloudCategory(
  slug: string,
  locale: string
): Promise<ProductCloudStoreCategory | null> {
  try {
    const qs = new URLSearchParams({ slug, locale })
    const data = await catalogFetch<{ categories: ProductCloudStoreCategory[] }>(
      `/store/product-cloud/categories?${qs}`
    )
    return data.categories?.find((category) => category.slug === slug) ?? null
  } catch {
    return null
  }
}

export async function fetchStorefrontListings(limit = 12): Promise<ListingProduct[]> {
  try {
    const qs = new URLSearchParams()
    qs.set("limit", String(Math.min(48, Math.max(1, limit))))
    qs.set("region_code", browserStorefrontMarket())
    const res = await catalogFetch<{ products: CatalogListProduct[] }>(
      `/store/catalog/products?${qs}`
    )
    return res.products
      .filter((p) => p.offer_count > 0 && (p.from_price ?? 0) > 0)
      .slice(0, limit)
      .map(toListing)
  } catch {
    return []
  }
}

export async function enrichOfferMetaFromCatalog(
  offerId: string,
  sellerId: string
): Promise<CartLineMeta | null> {
  try {
    const res = await catalogFetch<{ products: CatalogListProduct[] }>(
      "/store/catalog/products"
    )
    for (const item of res.products.slice(0, 40)) {
      const detail = await catalogFetch<{
        product: { id: string; title: string; brand_name: string | null }
        offers: CatalogOffer[]
      }>(`/store/catalog/products/${encodeURIComponent(item.id)}?region_code=${encodeURIComponent(browserStorefrontMarket())}`)
      const offer = detail.offers.find((o) => o.offer_id === offerId)
      if (!offer) continue
      const locale = browserStorefrontLocale()
      const meta: CartLineMeta = {
        offer_id: offerId,
        product_id: detail.product.id,
        slug: detail.product.id,
        title: detail.product.title,
        seller_id: offer.seller_id || sellerId,
        seller_name: offer.seller_name || `Seller ${sellerId.slice(-6)}`,
        verified: true,
        delivery: resolveOfferDeliveryLabel(
          {
            shipping_cost: Number(offer.shipping_cost) || 0,
            quantity_available: Number(offer.quantity_available) || 0,
          },
          locale
        ),
        stock:
          offer.quantity_available > 5
            ? t("inStock", locale)
            : offer.quantity_available > 0
              ? t("lowStock", locale)
              : t("outOfStock", locale),
        returns: t("trust30DayReturn", locale),
        image_hue: hashHue(offerId),
      }
      rememberCartLineMeta(meta)
      return meta
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function fetchProductsBySellerHint(
  sellerName: string,
  excludeSlug?: string,
  limit = 8
): Promise<ListingProduct[]> {
  const all = await fetchStorefrontListings(24)
  const filtered = all.filter((p) => p.slug !== excludeSlug)
  const bySeller = filtered.filter((p) =>
    p.seller.toLowerCase().includes(sellerName.toLowerCase().slice(0, 6))
  )
  return (bySeller.length >= 2 ? bySeller : filtered).slice(0, limit)
}
