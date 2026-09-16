import { t, categoryNavLabel } from "./i18n/messages"
import type { StorefrontLocale } from "./i18n/locales"
import { pickLocalized, type LocalizedString } from "./i18n/locales"
import type { ListingProduct } from "./listing-products"
import { findMarketplaceCategory } from "./marketplace-categories"
import type { ProductCloudStoreCategory } from "./product-cloud-store"
import type { ResolvedCategoryFilterGroup } from "./cms/resolve-category"

export function expandCategorySlugsWithParents(
  slugs: string[],
  taxonomy: ProductCloudStoreCategory[]
): string[] {
  const bySlug = new Map(
    taxonomy
      .filter((c): c is ProductCloudStoreCategory & { slug: string } => Boolean(c.slug))
      .map((c) => [c.slug, c])
  )
  const byId = new Map(taxonomy.map((c) => [c.id, c]))
  const out = new Set(slugs)
  for (const slug of slugs) {
    let node: ProductCloudStoreCategory | undefined = bySlug.get(slug)
    const seen = new Set<string>()
    while (node?.parent_category_id && !seen.has(node.id)) {
      seen.add(node.id)
      const parent = byId.get(node.parent_category_id)
      if (!parent?.slug) break
      out.add(parent.slug)
      node = parent
    }
  }
  return [...out]
}

export function withExpandedProductCategories(
  products: ListingProduct[],
  taxonomy: ProductCloudStoreCategory[]
): ListingProduct[] {
  return products.map((p) => ({
    ...p,
    categorySlugs: expandCategorySlugsWithParents(p.categorySlugs, taxonomy),
  }))
}

/** Category filters derived only from the selected action product set. */
export function deriveActionCategoryFilters(
  products: ListingProduct[],
  taxonomy: ProductCloudStoreCategory[],
  locale: StorefrontLocale
): ResolvedCategoryFilterGroup[] {
  const counts = new Map<string, number>()
  for (const product of products) {
    for (const slug of product.categorySlugs) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
  }
  const options = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .map(([slug]) => {
      const cat = taxonomy.find((c) => c.slug === slug)
      const fallback = findMarketplaceCategory(slug)?.label ?? slug
      return {
        id: `cat-${slug}`,
        label: cat?.name?.trim() || categoryNavLabel(slug, fallback, locale),
        value: slug,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, "nl"))
  if (options.length === 0) return []
  return [
    {
      id: "action-category",
      attributeKey: "category",
      label: t("filterCategory", locale),
      type: "checkbox",
      options,
    },
  ]
}

export function pickActionIntro(
  intro: LocalizedString | undefined,
  body: LocalizedString | undefined,
  locale: StorefrontLocale
): string {
  const fromIntro = intro ? pickLocalized(intro, locale).trim() : ""
  if (fromIntro) return fromIntro
  return body ? pickLocalized(body, locale).trim() : ""
}
