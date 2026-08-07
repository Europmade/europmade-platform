/**
 * Category listing helpers — CMS-driven filters (no global hardcoded filter set).
 */

import { discountPercent, type ListingProduct } from "./listing-products"
import type {
  ResolvedCategoryFilterGroup,
} from "./cms/resolve-category"

export type CategorySortKey =
  | "popularity"
  | "price-asc"
  | "price-desc"
  | "rating"

export const VERIFIED_FILTER_ID = "verified-only"

function productHaystack(product: ListingProduct): string {
  return [
    product.title,
    product.brand,
    ...product.features,
    ...product.keywords,
  ]
    .join(" ")
    .toLowerCase()
}

export function matchesCategoryFilters(
  product: ListingProduct,
  active: Set<string>,
  filterGroups: ResolvedCategoryFilterGroup[],
  countryCodes: Set<string>
): boolean {
  if (active.has(VERIFIED_FILTER_ID) && !product.verified) return false

  if (countryCodes.size > 0 && !countryCodes.has(product.countryCode)) {
    return false
  }

  // Attribute groups from CMS/AI — each selected group must match at least one option
  for (const group of filterGroups) {
    const selected = group.options.filter((o) => active.has(o.id))
    if (selected.length === 0) continue
    const hay = productHaystack(product)
    const ok = selected.some((o) => hay.includes(o.value.toLowerCase()))
    if (!ok) return false
  }

  return true
}

export function sortCategoryProducts(
  products: ListingProduct[],
  sort: CategorySortKey
): ListingProduct[] {
  const copy = [...products]
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.priceCents - b.priceCents)
    case "price-desc":
      return copy.sort((a, b) => b.priceCents - a.priceCents)
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating)
    case "popularity":
    default:
      return copy.sort(
        (a, b) => b.offerCount - a.offerCount || b.rating - a.rating
      )
  }
}

export function formatProductsFound(template: string, count: number): string {
  return template.replace("{count}", String(count))
}

export function formatProductsCountOf(
  template: string,
  shown: number,
  total: number
): string {
  return template
    .replace("{shown}", String(shown))
    .replace("{total}", String(total))
}

export function hasDiscount(product: ListingProduct): boolean {
  return discountPercent(product) != null
}
