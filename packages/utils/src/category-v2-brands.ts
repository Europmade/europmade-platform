/**
 * Category CMS brand row.
 * Brands are derived from the products already selected for the category.
 * The CMS document does not store a second brand list.
 */

const BRAND_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type CategoryBrandProduct = {
  id: string
  brandId?: string | null
  brandName?: string | null
  brandSlug?: string | null
  logoUrl?: string | null
  brandPagePublished?: boolean
}

export type CategoryBrandCard = {
  id: string
  name: string
  logoUrl: string | null
  href: string | null
  productCount: number
}

export function categoryBrandHref(
  slug: string | null | undefined,
  pagePublished: boolean | undefined
): string | null {
  if (pagePublished !== true) return null
  const value = String(slug ?? "").trim().toLowerCase()
  if (!BRAND_SLUG.test(value)) return null
  return `/merk/${value}`
}

/** One card per brand id. Product ids are counted once. Order is count, then name. */
export function selectCategoryBrands(
  products: CategoryBrandProduct[],
  maxItems: number
): CategoryBrandCard[] {
  const seenProducts = new Set<string>()
  const groups = new Map<
    string,
    { name: string; logoUrl: string | null; slug: string | null; published: boolean; products: Set<string> }
  >()

  for (const product of products) {
    const productId = product.id.trim()
    const brandId = product.brandId?.trim() ?? ""
    const name = product.brandName?.trim() ?? ""
    const hasIdentity = Boolean(
      product.brandSlug?.trim() || product.logoUrl?.trim() || product.brandPagePublished
    )
    if (!productId || !brandId || !name) continue
    if (name === brandId && !hasIdentity) continue
    if (seenProducts.has(productId)) continue
    seenProducts.add(productId)
    const current = groups.get(brandId)
    const logo = product.logoUrl?.trim() || null
    if (!current) {
      groups.set(brandId, {
        name,
        logoUrl: logo,
        slug: product.brandSlug?.trim() || null,
        published: product.brandPagePublished === true,
        products: new Set([productId]),
      })
      continue
    }
    current.products.add(productId)
    if (!current.logoUrl && logo) current.logoUrl = logo
  }

  const cards = [...groups.entries()].map(([id, group]) => ({
    id,
    name: group.name,
    logoUrl: group.logoUrl,
    href: categoryBrandHref(group.slug, group.published),
    productCount: group.products.size,
  }))
  cards.sort(
    (left, right) =>
      right.productCount - left.productCount ||
      left.name.localeCompare(right.name, "nl") ||
      left.id.localeCompare(right.id)
  )
  const limit = Number.isFinite(maxItems) ? Math.max(0, Math.floor(maxItems)) : 16
  return cards.filter((card) => card.productCount > 0).slice(0, limit)
}
