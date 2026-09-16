import {
  commercialCatalogCategoryParam,
  findCommercialNavGroup,
  isCommercialNavKey,
} from "@europmade/utils"
import type { ProductCloudStoreCategory } from "./product-cloud-store"

/**
 * Storefront listing route is valid for a real pc_category slug OR a
 * commercial nav key (Fase 5 grouping — not a pc_category record).
 */
export function isCanonicalStorefrontCategory(
  slug: string,
  productCloud: ProductCloudStoreCategory | null
): boolean {
  if (productCloud?.slug === slug) return true
  return isCommercialNavKey(slug)
}

export function catalogCategoryFilterForSlug(slug: string): string {
  return commercialCatalogCategoryParam(slug) ?? slug
}

export function commercialCategoryTitle(
  slug: string,
  locale?: string | null
): string | null {
  const group = findCommercialNavGroup(slug)
  if (!group) return null
  const loc =
    locale === "en" || locale === "de" || locale === "fr" ? locale : "nl"
  return group.label[loc] || group.label.nl
}
