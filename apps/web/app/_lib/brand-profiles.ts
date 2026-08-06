import {
  LISTING_PRODUCTS,
  type ListingProduct,
} from "./listing-products"
import { HOMEPAGE_RETAILERS } from "./homepage-content"
import { slugifyForBrand } from "./brand-slug"

export type BrandProfile = {
  slug: string
  name: string
  meta: string
  description: string
}

const EXTRA_BRANDS: BrandProfile[] = [
  {
    slug: "lawn-eu",
    name: "LawnEU",
    meta: "Tuin · Europa",
    description: "Robotmaaiers en gazononderhoud.",
  },
  {
    slug: "nordlicht",
    name: "Nordlicht",
    meta: "Elektronica · Noord-Europa",
    description: "Verlichting en bureaulampen.",
  },
]

export function listBrandProfiles(): BrandProfile[] {
  const fromHomepage = HOMEPAGE_RETAILERS.map((r) => ({
    slug: r.slug,
    name: r.name,
    meta: r.meta,
    description: r.description,
  }))
  const known = new Map<string, BrandProfile>()
  for (const b of [...fromHomepage, ...EXTRA_BRANDS]) {
    known.set(b.slug, b)
  }
  for (const p of LISTING_PRODUCTS) {
    const slug = slugifyForBrand(p.brand)
    if (!known.has(slug)) {
      known.set(slug, {
        slug,
        name: p.brand,
        meta: p.countryLabel,
        description: `Producten van ${p.brand} op EuropMade.`,
      })
    }
  }
  return [...known.values()]
}

export function findBrandProfile(slug: string): BrandProfile | null {
  return listBrandProfiles().find((b) => b.slug === slug) ?? null
}

export function productsForBrand(slug: string): ListingProduct[] {
  const brand = findBrandProfile(slug)
  if (!brand) return []
  return LISTING_PRODUCTS.filter(
    (p) => slugifyForBrand(p.brand) === slug || p.brand === brand.name
  )
}
