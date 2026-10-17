import { parseBrandCardPresentation, selectConfiguredBrandSpotlights } from "@europmade/utils"
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
        image: null,
        logo: null,
        ...parseBrandCardPresentation({}),
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
  catalog: ResolvedPartnerSpotlight[] = [],
  limit = 12
): ResolvedPartnerSpotlight[] {
  return selectConfiguredBrandSpotlights(cmsItems, catalog).slice(0, limit)
}
