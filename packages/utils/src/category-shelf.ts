/**
 * Products already visible on the category page.
 * A sellable offer is not required: the storefront test catalog stays visible
 * and keeps its own not-for-sale label. Unpublished products that are not in
 * that catalog stay out. A group is the most specific category slug, so one
 * product type cannot fill the shelf while another type is available.
 * Popularity is only a stored sales count. Offer counts and ratings are not sales.
 */
export type CategoryShelfCandidate = {
  slug: string
  categorySlugs: string[]
  priceCents: number
  offerCount: number
  testCatalog?: boolean
  previewStatus?: string
  salesCount?: number | null
}

export function categoryShelfGroup(slugs: string[], pageSlug: string): string {
  const page = pageSlug.trim().toLowerCase()
  const chain = slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean)
  return [...chain].reverse().find((slug) => slug !== page) || page || chain[0] || "categorie"
}

/** Same visibility as the storefront catalog: a real offer, or the enabled test catalog. */
export function categoryShelfVisible(product: CategoryShelfCandidate): boolean {
  if (product.testCatalog === true) return true
  if (product.previewStatus === "concept") return false
  return product.offerCount > 0 && Number.isFinite(product.priceCents) && product.priceCents > 0
}

export function selectCategoryShelf<T extends CategoryShelfCandidate>(
  products: T[],
  pageSlug: string,
  limit = 15
): T[] {
  const size = Math.max(1, Math.min(15, Math.floor(limit) || 15))
  const eligible = products.filter(categoryShelfVisible)
  const groups = new Map<string, T[]>()
  for (const product of eligible) {
    const key = categoryShelfGroup(product.categorySlugs, pageSlug)
    const list = groups.get(key) ?? []
    list.push(product)
    groups.set(key, list)
  }
  for (const list of groups.values()) {
    list.sort((left, right) => {
      const leftSales = left.salesCount
      const rightSales = right.salesCount
      const leftKnown = leftSales != null && leftSales > 0
      const rightKnown = rightSales != null && rightSales > 0
      if (leftKnown && rightKnown && leftSales !== rightSales) return rightSales - leftSales
      if (leftKnown !== rightKnown) return leftKnown ? -1 : 1
      return 0
    })
  }
  const keys = [...groups.keys()]
  const picked: T[] = []
  const seen = new Set<string>()
  let turn = 0
  while (picked.length < size && keys.some((key) => (groups.get(key)?.length ?? 0) > 0)) {
    const list = groups.get(keys[turn % keys.length]!)!
    const next = list.shift()
    if (next && !seen.has(next.slug)) {
      seen.add(next.slug)
      picked.push(next)
    }
    turn += 1
    if (turn > size * Math.max(keys.length, 1) + keys.length) break
  }
  return picked
}

/** True only when this product's stored sales are the highest known sales in the shelf. */
export function categoryProductIsPopular(
  product: { salesCount?: number | null },
  peers: Array<{ salesCount?: number | null }>
): boolean {
  const sales = product.salesCount
  if (sales == null || !Number.isFinite(sales) || sales <= 0) return false
  const known = peers
    .map((peer) => peer.salesCount)
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0)
  if (known.length === 0) return false
  return sales === Math.max(...known)
}
