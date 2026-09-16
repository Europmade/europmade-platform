/**
 * MVP-aanbevelingen (frontend-only). Later vervangen door AI / koop- / klikdata.
 * Catalogus-pool + Local Storage — geen seed-producten.
 */

import {
  type ListingProduct,
} from "./listing-products"
import { readRecentlyViewed } from "./recently-viewed"

const ACCESSORY_HINTS = [
  "accessoire",
  "oplader",
  "mes",
  "filter",
  "hoes",
  "kabel",
  "adapter",
  "set",
  "kit",
  "slang",
  "borstel",
]

function sharedCategories(a: ListingProduct, b: ListingProduct): number {
  return a.categorySlugs.filter((c) => b.categorySlugs.includes(c)).length
}

function sharedFeatures(a: ListingProduct, b: ListingProduct): number {
  const af = new Set(a.features.map((f) => f.toLowerCase()))
  return b.features.filter((f) => af.has(f.toLowerCase())).length
}

function priceProximity(a: ListingProduct, b: ListingProduct): number {
  const mid = Math.max(a.priceCents, 1)
  const ratio = Math.abs(a.priceCents - b.priceCents) / mid
  return Math.max(0, 1 - ratio)
}

function isAccessoryLike(p: ListingProduct): boolean {
  const hay = `${p.title} ${p.features.join(" ")} ${p.keywords.join(" ")}`.toLowerCase()
  return ACCESSORY_HINTS.some((h) => hay.includes(h))
}

function scoreSimilar(seed: ListingProduct, candidate: ListingProduct): number {
  return (
    sharedCategories(seed, candidate) * 4 +
    priceProximity(seed, candidate) * 3 +
    sharedFeatures(seed, candidate) * 2 +
    (candidate.verified ? 0.5 : 0) +
    candidate.rating * 0.1
  )
}

function scoreTogether(seed: ListingProduct, candidate: ListingProduct): number {
  const sameBrand = candidate.brand === seed.brand ? 5 : 0
  const accessory = isAccessoryLike(candidate) ? 3 : 0
  const complementary =
    sharedCategories(seed, candidate) === 0 && sameBrand === 0 ? 1.5 : 0
  const sameCatOtherBrand =
    sharedCategories(seed, candidate) > 0 && candidate.brand !== seed.brand
      ? 0.5
      : 0
  return (
    sameBrand +
    accessory +
    complementary +
    sameCatOtherBrand +
    priceProximity(seed, candidate) * 1.5 +
    candidate.rating * 0.1
  )
}

function scoreOthersViewed(seed: ListingProduct, candidate: ListingProduct): number {
  return (
    sharedCategories(seed, candidate) * 3.5 +
    priceProximity(seed, candidate) * 2.5 +
    sharedFeatures(seed, candidate) * 2.5 +
    candidate.rating * 0.25 +
    (candidate.offerCount > 1 ? 0.4 : 0)
  )
}

function resolvePool(pool?: ListingProduct[]): ListingProduct[] {
  // Geen seed-fallback: ontbrekende pool = lege live catalogus.
  if (pool === undefined) return []
  return pool
}

function rank(
  seed: ListingProduct,
  scoreFn: (seed: ListingProduct, c: ListingProduct) => number,
  limit: number,
  exclude: Set<string>,
  pool?: ListingProduct[]
): ListingProduct[] {
  return resolvePool(pool)
    .filter((p) => p.slug !== seed.slug && !exclude.has(p.slug))
    .map((p) => ({ p, score: scoreFn(seed, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))
    .slice(0, limit)
    .map((x) => x.p)
}

/** Zelfde categorie, vergelijkbare prijs/eigenschappen — later AI. */
export function recommendSimilar(
  seed: ListingProduct,
  limit = 12,
  exclude: string[] = [],
  pool?: ListingProduct[]
): ListingProduct[] {
  return rank(seed, scoreSimilar, limit, new Set(exclude), pool)
}

/** Zelfde producent, accessoires, complementair — later koopdata. */
export function recommendFrequentlyBoughtTogether(
  seed: ListingProduct,
  limit = 12,
  exclude: string[] = [],
  pool?: ListingProduct[]
): ListingProduct[] {
  return rank(seed, scoreTogether, limit, new Set(exclude), pool)
}

/** Populaire alternatieven — later klikdata. */
export function recommendOthersAlsoViewed(
  seed: ListingProduct,
  limit = 12,
  exclude: string[] = [],
  pool?: ListingProduct[]
): ListingProduct[] {
  return rank(seed, scoreOthersViewed, limit, new Set(exclude), pool)
}

/** Local Storage — laatste 20, exclusief huidig product. */
export function recommendRecentlyViewed(
  excludeSlug?: string,
  limit = 20
): ListingProduct[] {
  return readRecentlyViewed()
    .filter((p) => p.slug !== excludeSlug)
    .slice(0, limit) as ListingProduct[]
}

/** Geschat review-aantal tot API reviews beschikbaar zijn. */
export function estimateReviewCount(product: ListingProduct): number {
  return Math.max(8, Math.round(product.rating * 67 + product.offerCount * 11))
}
