import type { ListingProduct } from "./listing-products"

const STORAGE_KEY = "em_recently_viewed_v1"
const MAX = 20

export type RecentProduct = Pick<
  ListingProduct,
  "slug" | "title" | "brand" | "priceCents" | "verified" | "seller" | "offerCount" | "rating" | "countryCode" | "countryLabel" | "categorySlugs" | "features" | "keywords"
>

export function rememberRecentlyViewed(product: RecentProduct) {
  if (typeof window === "undefined") return
  try {
    const prev = readRecentlyViewed()
    const next = [product, ...prev.filter((p) => p.slug !== product.slug)].slice(
      0,
      MAX
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function readRecentlyViewed(): RecentProduct[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentProduct[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
