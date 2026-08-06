/**
 * Frontend-only partner profiles for marketplace partner pages.
 * No backend dependency — presentation data for /partner/[slug].
 */

import { HOMEPAGE_RETAILERS } from "./homepage-content"
import { LISTING_PRODUCTS, type ListingProduct } from "./listing-products"
import { slugifyForBrand } from "./brand-slug"
import { hashHue } from "./cart-line-meta"

export type PartnerProfile = {
  slug: string
  name: string
  description: string
  verified: boolean
  productionCountry: string
  hqCountry: string
  foundedYear: number
  rating: number
  reviewCount: number
  avgDelivery: string
  returnsPolicy: string
  website?: string
  social?: { label: string; href: string }[]
  productCountHint?: number
}

const EXTRA_PARTNERS: PartnerProfile[] = [
  {
    slug: "tuinpro-nl",
    name: "TuinPro NL",
    description:
      "Nederlandse tuinretailer met focus op Europese makers en snelle levering.",
    verified: true,
    productionCountry: "Nederland",
    hqCountry: "Nederland",
    foundedYear: 2011,
    rating: 4.6,
    reviewCount: 842,
    avgDelivery: "1-3 werkdagen",
    returnsPolicy: "30 dagen retour",
    website: "https://example.com",
    social: [{ label: "LinkedIn", href: "https://linkedin.com" }],
  },
  {
    slug: "gartenhaus-de",
    name: "GartenHaus DE",
    description:
      "Duitse specialist in outdoor en tuin, met EU Verified assortiment.",
    verified: true,
    productionCountry: "Duitsland",
    hqCountry: "Duitsland",
    foundedYear: 2004,
    rating: 4.4,
    reviewCount: 1203,
    avgDelivery: "2-4 werkdagen",
    returnsPolicy: "30 dagen retour",
  },
]

function fromHomepage(): PartnerProfile[] {
  return HOMEPAGE_RETAILERS.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    verified: true,
    productionCountry: r.country,
    hqCountry: r.country,
    foundedYear: 2010,
    rating: r.rating,
    reviewCount: 500,
    avgDelivery: "2-4 werkdagen",
    returnsPolicy: "30 dagen retour",
    productCountHint: r.productCount,
  }))
}

function fromListingSellers(): PartnerProfile[] {
  const sellers = new Map<string, string>()
  for (const p of LISTING_PRODUCTS) {
    const slug = slugifyForBrand(p.seller)
    if (!sellers.has(slug)) sellers.set(slug, p.seller)
  }
  return [...sellers.entries()].map(([slug, name]) => ({
    slug,
    name,
    description: `${name} verkoopt Europese producten via EuropMade.`,
    verified: true,
    productionCountry: "Europa",
    hqCountry: "Europa",
    foundedYear: 2012,
    rating: 4.3,
    reviewCount: 120,
    avgDelivery: "2-4 werkdagen",
    returnsPolicy: "30 dagen retour",
  }))
}

export function listPartnerProfiles(): PartnerProfile[] {
  const map = new Map<string, PartnerProfile>()
  for (const p of [...fromHomepage(), ...EXTRA_PARTNERS, ...fromListingSellers()]) {
    map.set(p.slug, p)
  }
  return [...map.values()]
}

export function findPartnerProfile(slug: string): PartnerProfile | null {
  return listPartnerProfiles().find((p) => p.slug === slug) ?? null
}

export function findPartnerByName(name: string): PartnerProfile | null {
  const slug = slugifyForBrand(name)
  return (
    findPartnerProfile(slug) ??
    listPartnerProfiles().find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    ) ??
    null
  )
}

export function partnerHref(nameOrSlug: string): string {
  const byName = findPartnerByName(nameOrSlug)
  if (byName) return `/partner/${byName.slug}`
  return `/partner/${slugifyForBrand(nameOrSlug)}`
}

export function productsForPartner(
  profile: PartnerProfile,
  catalog: ListingProduct[]
): ListingProduct[] {
  const slug = profile.slug
  return catalog.filter(
    (p) =>
      slugifyForBrand(p.seller) === slug ||
      slugifyForBrand(p.brand) === slug ||
      p.seller === profile.name ||
      p.brand === profile.name
  )
}

export function partnerCoverStyle(slug: string) {
  const hue = hashHue(slug)
  return {
    background: `linear-gradient(120deg, hsl(${hue} 35% 18%), hsl(${(hue + 50) % 360} 28% 36%))`,
  }
}

export function partnerLogoStyle(slug: string) {
  const hue = hashHue(slug)
  return {
    background: `linear-gradient(145deg, hsl(${hue} 40% 92%), hsl(${(hue + 40) % 360} 30% 78%))`,
  }
}
