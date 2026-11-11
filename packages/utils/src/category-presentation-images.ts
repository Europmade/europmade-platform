/**
 * Deterministic Product Cloud images for category presentation.
 * The same products always yield the same image. Nothing is stored.
 */

export type PresentationImageSource = {
  slug: string
  title?: string
  imageUrl?: string | null
  imageUrls?: string[]
  categorySlugs?: string[]
  testCatalog?: boolean
}

export type DisplayableMediaItem = {
  media_type?: string | null
  storage_reference?: string | null
  sort_order?: number | null
}

function clean(value: string | null | undefined): string {
  return (value ?? "").trim()
}

/** A stored reference that a browser can load. `upload://` has no file. */
export function displayableStorageReference(raw: string | null | undefined): string | null {
  const trimmed = clean(raw)
  if (!trimmed || trimmed.startsWith("upload://")) return null
  return trimmed
}

/**
 * Primary image when it can be shown. Otherwise the next non-video image
 * of the same product, in stored order.
 */
export function listDisplayableMediaReferences(items: readonly DisplayableMediaItem[]): string[] {
  const ordered = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const primary = ordered.filter((item) => item.media_type === "Hoofdafbeelding")
  const extra = ordered.filter(
    (item) => item.media_type !== "Hoofdafbeelding" && item.media_type !== "Video"
  )
  const urls: string[] = []
  const seen = new Set<string>()
  for (const item of [...primary, ...extra]) {
    const url = displayableStorageReference(item.storage_reference)
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push(url)
  }
  return urls
}

export function pickDisplayableMediaReference(items: readonly DisplayableMediaItem[]): string | null {
  return listDisplayableMediaReferences(items)[0] ?? null
}

function belongsTo(product: PresentationImageSource, categorySlug: string): boolean {
  const wanted = categorySlug.trim().toLowerCase()
  if (!wanted) return false
  return (product.categorySlugs ?? []).some((slug) => slug.trim().toLowerCase() === wanted)
}

function byStableProduct(a: PresentationImageSource, b: PresentationImageSource): number {
  const test = Number(a.testCatalog === true) - Number(b.testCatalog === true)
  if (test !== 0) return test
  return clean(a.slug).localeCompare(clean(b.slug), "nl")
}

/**
 * Products that can illustrate `categorySlug`.
 * Pass null only for a list that is already limited to the current category.
 */
export function representativeCategoryImages<T extends PresentationImageSource>(
  products: readonly T[],
  categorySlug: string | null
): T[] {
  return products
    .filter((product) => {
      if (!displayableStorageReference(product.imageUrl)) return false
      if (categorySlug == null) return true
      return belongsTo(product, categorySlug)
    })
    .sort(byStableProduct)
}

export function representativeCategoryImage<T extends PresentationImageSource>(
  products: readonly T[],
  categorySlug: string | null
): T | null {
  return representativeCategoryImages(products, categorySlug)[0] ?? null
}

export type CategoryCollageImage = {
  url: string
  title: string
  slug: string
}

/**
 * Up to `limit` different pictures for one category frame.
 * One picture per product comes first, so a hub does not repeat a single packshot.
 * Extra pictures of the same product fill a frame only when fewer products have an image.
 */
export function representativeCategoryCollage(
  products: readonly PresentationImageSource[],
  categorySlug: string | null,
  limit = 3
): CategoryCollageImage[] {
  const pool = representativeCategoryImages(products, categorySlug)
  const chosen: CategoryCollageImage[] = []
  const seen = new Set<string>()
  const seenLeaves = new Set<string>()
  function leaf(product: PresentationImageSource): string {
    const slugs = (product.categorySlugs ?? []).map((slug) => slug.trim().toLowerCase()).filter(Boolean)
    if (slugs.length === 0) return clean(product.slug)
    return slugs.slice().sort((left, right) => right.length - left.length)[0]!
  }
  function push(slug: string, title: string | undefined, raw: string | null | undefined) {
    if (chosen.length >= limit) return
    const url = displayableStorageReference(raw)
    if (!url || seen.has(url)) return
    seen.add(url)
    chosen.push({ url, title: clean(title) || clean(slug), slug: clean(slug) })
  }
  for (const product of pool) {
    const group = leaf(product)
    if (seenLeaves.has(group)) continue
    seenLeaves.add(group)
    push(product.slug, product.title, product.imageUrl)
  }
  for (const product of pool) push(product.slug, product.title, product.imageUrl)
  for (const product of pool) {
    for (const extra of product.imageUrls ?? []) push(product.slug, product.title, extra)
  }
  return chosen
}

/** Slug from an internal category link. Other links return null. */
export function categorySlugFromHref(href: string | null | undefined): string | null {
  const raw = clean(href)
  if (!raw) return null
  const match = raw.match(/\/categorie\/([^/?#]+)/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase()
  } catch {
    return match[1].trim().toLowerCase()
  }
}
