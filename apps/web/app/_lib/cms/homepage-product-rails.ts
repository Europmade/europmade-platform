/**
 * Homepage product rails — shared by live homepage and CMS preview.
 */

import type { ListingProduct } from "../listing-products"
import type { ResolvedHomepageSection } from "../cms/resolve-homepage"

export type HomepageProductSort =
  | "offers"
  | "newest"
  | "rating"
  | "price_asc"
  | "price_desc"
  | "random"

export function isHomepageProductSort(
  value: unknown
): value is HomepageProductSort {
  return (
    value === "offers" ||
    value === "newest" ||
    value === "rating" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "random"
  )
}

function seededUnit(seed: number): () => number {
  let s = seed >>> 0
  if (s === 0) s = 1
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  const rnd = seededUnit(seed || 1)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

export function pickHomepageRailProducts(
  pool: ListingProduct[],
  section: ResolvedHomepageSection | null | undefined,
  fallbackSort: HomepageProductSort,
  defaultLimit = 12
): ListingProduct[] {
  const limit = Math.min(
    48,
    Math.max(1, Number(section?.limit ?? defaultLimit) || defaultLimit)
  )
  const ids = (section?.productIds ?? []).map(String).filter(Boolean)
  if (ids.length > 0) {
    const byKey = new Map<string, ListingProduct>()
    for (const p of pool) {
      byKey.set(p.slug, p)
    }
    const ordered = ids
      .map((id) => byKey.get(id))
      .filter((p): p is ListingProduct => Boolean(p))
    if (ordered.length > 0) return ordered.slice(0, limit)
  }

  const sort = isHomepageProductSort(section?.sortMode)
    ? section!.sortMode!
    : fallbackSort
  let sorted = [...pool]

  if (sort === "newest") {
    // Catalog listing is newest-first; keep API order (do not re-sort by popularity).
  } else if (sort === "rating") {
    sorted.sort(
      (a, b) =>
        b.rating - a.rating ||
        b.offerCount - a.offerCount ||
        a.title.localeCompare(b.title)
    )
  } else if (sort === "price_asc") {
    sorted.sort(
      (a, b) =>
        a.priceCents - b.priceCents ||
        b.rating - a.rating ||
        a.title.localeCompare(b.title)
    )
  } else if (sort === "price_desc") {
    sorted.sort(
      (a, b) =>
        b.priceCents - a.priceCents ||
        b.rating - a.rating ||
        a.title.localeCompare(b.title)
    )
  } else if (sort === "random") {
    const seed =
      typeof section?.sortSeed === "number" && Number.isFinite(section.sortSeed)
        ? section.sortSeed
        : sorted.reduce((acc, p) => acc + p.slug.length * 17 + p.priceCents, 42)
    sorted = seededShuffle(sorted, seed)
  } else {
    // offers / best sold proxy
    sorted.sort(
      (a, b) =>
        b.offerCount - a.offerCount ||
        b.rating - a.rating ||
        a.priceCents - b.priceCents
    )
  }
  return sorted.slice(0, limit)
}
