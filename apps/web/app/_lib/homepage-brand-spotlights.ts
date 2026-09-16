import { slugifyForBrand } from "./brand-slug"
import type { ResolvedPartnerSpotlight } from "./cms/resolve-homepage"
import type { ListingProduct } from "./listing-products"

/**
 * Publieke merken voor homepage-kaarten: alleen merken met live catalogusproducten.
 */
export function liveBrandSpotlightsFromProducts(
  products: ListingProduct[],
  limit = 6
): ResolvedPartnerSpotlight[] {
  const map = new Map<
    string,
    ResolvedPartnerSpotlight & { ratingSum: number; ratingN: number }
  >()
  for (const product of products) {
    const name = (product.brand || "").trim()
    const slug = slugifyForBrand(name)
    if (!slug) continue
    const current = map.get(slug)
    if (!current) {
      map.set(slug, {
        slug,
        name,
        country: product.countryLabel || "",
        rating: product.rating || 0,
        productCount: 1,
        description: "",
        image: product.imageUrl ?? null,
        logo: null,
        backgroundKey: "light",
        ratingSum: product.rating || 0,
        ratingN: product.rating ? 1 : 0,
      })
      continue
    }
    current.productCount += 1
    if (product.rating) {
      current.ratingSum += product.rating
      current.ratingN += 1
    }
    if (!current.image && product.imageUrl) current.image = product.imageUrl
  }
  return [...map.values()]
    .map(({ ratingSum, ratingN, ...row }) => ({
      ...row,
      rating: ratingN ? ratingSum / ratingN : row.rating,
    }))
    .sort(
      (a, b) => b.productCount - a.productCount || b.rating - a.rating
    )
    .slice(0, limit)
}

export function mergeHomepageBrandSpotlights(
  cmsItems: ResolvedPartnerSpotlight[],
  live: ResolvedPartnerSpotlight[],
  limit = 6
): ResolvedPartnerSpotlight[] {
  const liveBySlug = new Map(live.map((row) => [row.slug, row]))
  const out: ResolvedPartnerSpotlight[] = []
  const seen = new Set<string>()

  for (const item of cmsItems) {
    const slug = item.slug?.trim()
    if (!slug) continue
    const hit = liveBySlug.get(slug)
    if (!hit) continue
    seen.add(slug)
    out.push({
      ...hit,
      name: item.name || hit.name,
      description: item.description || hit.description,
      logo: item.logo || hit.logo,
      image: item.image || hit.image,
      country: item.country || hit.country,
      backgroundKey: item.backgroundKey || hit.backgroundKey,
    })
    if (out.length >= limit) return out
  }

  for (const row of live) {
    if (seen.has(row.slug)) continue
    out.push(row)
    if (out.length >= limit) break
  }
  return out
}
