/**
 * Draft-preview only. Concept products stay unsellable and are never
 * mixed into the public catalog by this module.
 */

export type CategoryPreviewConceptProduct = {
  id: string
  title: string
  brand_name: string | null
  image_url: string | null
  image_urls?: string[]
  category_slugs?: string[]
  from_price: number | null
  attributes: Array<{ code: string; value: string }>
  publication_status: "Concept"
}

const ADMIN_PREVIEW_ORIGINS = new Set([
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://192.168.2.17:3001",
])

export function isCmsPreviewAdminOrigin(origin: string): boolean {
  return ADMIN_PREVIEW_ORIGINS.has(origin)
}

export function conceptProductBelongsInPreview(input: {
  title: string
  lifecycleStatus: string
  publicationStatus: string
  categorySlugs: string[]
  categoryFilter: string
}): boolean {
  if (input.publicationStatus !== "Concept") return false
  if (input.lifecycleStatus === "Gearchiveerd") return false
  if (!input.title.trim()) return false
  const wanted = new Set(
    input.categoryFilter
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
  )
  if (wanted.size === 0) return false
  return input.categorySlugs.some((slug) => wanted.has(slug.trim().toLowerCase()))
}

/** A stored price may be shown. The product is still not an offer. */
export function conceptPreviewPriceCents(fromPrice: number | null | undefined): number {
  if (fromPrice == null || !Number.isFinite(fromPrice) || fromPrice <= 0) return 0
  return Math.round(fromPrice * 100)
}

export function conceptPreviewSpecs(
  attributes: Array<{ code?: string | null; value?: string | null }>
): Array<{ code: string; value: string }> {
  return attributes.flatMap((row) => {
    const code = row.code?.trim() || ""
    const value = row.value?.trim() || ""
    if (!code || !value) return []
    return [{ code, value }]
  })
}

export function mergeDraftPreviewProducts<T extends { slug: string }>(
  published: T[],
  concepts: T[]
): T[] {
  const seen = new Set(published.map((product) => product.slug))
  return [
    ...published,
    ...concepts.filter((product) => product.slug.trim() && !seen.has(product.slug)),
  ]
}
