/**
 * Browser-safe catalog helpers (no Next.js `next.revalidate` options).
 */

import type { ListingProduct } from "./listing-products"
import type { CartLineMeta } from "./cart-line-meta"
import { hashHue, rememberCartLineMeta } from "./cart-line-meta"
import { resolveOfferDeliveryLabel } from "./offer-delivery"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
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
}

type CatalogOffer = {
  offer_id: string
  seller_id: string
  seller_name: string
  quantity_available: number
  shipping_cost: number
}

async function catalogFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
    },
  })
  if (!response.ok) throw new Error("Catalog fetch failed")
  return response.json() as Promise<T>
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
  }
}

export async function fetchStorefrontListings(limit = 12): Promise<ListingProduct[]> {
  try {
    const res = await catalogFetch<{ products: CatalogListProduct[] }>(
      "/store/catalog/products"
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
      }>(`/store/catalog/products/${encodeURIComponent(item.id)}?region_code=NL`)
      const offer = detail.offers.find((o) => o.offer_id === offerId)
      if (!offer) continue
      const meta: CartLineMeta = {
        offer_id: offerId,
        product_id: detail.product.id,
        slug: detail.product.id,
        title: detail.product.title,
        seller_id: offer.seller_id || sellerId,
        seller_name: offer.seller_name || `Verkoper ${sellerId.slice(-6)}`,
        verified: true,
        delivery: resolveOfferDeliveryLabel({
          shipping_cost: Number(offer.shipping_cost) || 0,
          quantity_available: Number(offer.quantity_available) || 0,
        }),
        stock:
          offer.quantity_available > 5
            ? "Op voorraad"
            : offer.quantity_available > 0
              ? `Nog ${offer.quantity_available} op voorraad`
              : "Beperkte voorraad",
        returns: "30 dagen retour",
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
