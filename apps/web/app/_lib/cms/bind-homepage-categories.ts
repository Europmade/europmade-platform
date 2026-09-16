import type { HomepageCategory } from "../homepage-content"
import type { ProductCloudStoreCategory } from "../product-cloud-store"

/**
 * Known CMS picker mistakes (old hardcoded labels) → canonical pc_category.slug.
 * Used only to bind existing homepage documents; not a product seed.
 */
const LEGACY_CMS_CATEGORY_SLUGS: Record<string, string> = {
  "tuin-buitenleven": "tuin",
  "wonen-interieur": "wonen",
  "keuken-koken": "keuken",
  "mode-accessoires": "mode",
  "sport-vrije-tijd": "sport",
  "verzorging-beauty": "beauty-verzorging",
}

export function canonicalPcCategorySlug(slug: string): string {
  const key = slug.trim().toLowerCase()
  return LEGACY_CMS_CATEGORY_SLUGS[key] ?? key
}

/**
 * Homepage category cards must resolve to a live pc_category.
 * Unmatched CMS rows are dropped (no mock/404 links).
 */
export function bindHomepageCategoriesToProductCloud(
  cards: HomepageCategory[],
  taxonomy: ProductCloudStoreCategory[] | null
): HomepageCategory[] {
  if (!taxonomy?.length) return []
  const byId = new Map(taxonomy.map((c) => [c.id, c]))
  const bySlug = new Map(
    taxonomy
      .filter((c): c is ProductCloudStoreCategory & { slug: string } => Boolean(c.slug))
      .map((c) => [c.slug, c])
  )

  const out: HomepageCategory[] = []
  const seen = new Set<string>()
  for (const card of cards) {
    const fromId = card.categoryId ? byId.get(card.categoryId) : undefined
    const wantedSlug = canonicalPcCategorySlug(card.slug)
    const fromSlug = bySlug.get(wantedSlug)
    const pc = fromId?.slug ? fromId : fromSlug
    if (!pc?.slug) continue
    if (seen.has(pc.slug)) continue
    seen.add(pc.slug)
    const image = card.image?.trim() ? card.image.trim() : null
    out.push({
      slug: pc.slug,
      label: pc.name.trim() || card.label,
      popular: true,
      image,
      categoryId: pc.id,
    })
  }
  return out
}
