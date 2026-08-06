/**
 * Redactionele Homepage-content (spec homepage §0.4 / §2).
 * Product-/categoriedata wordt later vervangen door Catalog/Search-API's —
 * geen publieke list-API beschikbaar in de huidige backend.
 */

import {
  POPULAR_MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
} from "./marketplace-categories"

export type HomepageCategory = MarketplaceCategory

export type HomepageRetailer = {
  name: string
  meta: string
  description: string
  /** Publieke merk-/retailerpagina (`/merk/[slug]`). */
  slug: string
}

export const HOMEPAGE_NAV_LINKS = [
  { label: "Categorieën", href: "/categorie" },
  { label: "Tuin", href: "/categorie/tuin" },
  { label: "Elektronica", href: "/categorie/elektronica" },
  { label: "Mode", href: "/categorie/mode" },
  { label: "Over EuropMade", href: "/over" },
] as const

/** Homepage sectie 4 — populaire subset van de 30 hoofdcategorieën. */
export const HOMEPAGE_CATEGORIES: HomepageCategory[] =
  POPULAR_MARKETPLACE_CATEGORIES

/** Uitgelichte producten: zie `featuredListingProducts()` in listing-products.ts. */

export const HOMEPAGE_RETAILERS: HomepageRetailer[] = [
  {
    name: "VerdeTech",
    meta: "★ 4,6 · Nederland",
    description: "Producent van tuingereedschap, actief sinds 2015.",
    slug: "verdetech",
  },
  {
    name: "Atelier Rossi",
    meta: "★ 4,8 · Italië",
    description: "Keramiek en keukenwaar, familiebedrijf sinds 1962.",
    slug: "atelier-rossi",
  },
  {
    name: "Wolfabriek B.",
    meta: "★ 4,5 · België",
    description: "Wollen producten, ambachtelijk vervaardigd.",
    slug: "wolfabriek-b",
  },
]

export const HOMEPAGE_TRUST_ITEMS = [
  "Verified™ productinformatie",
  "30 dagen retour",
  "Uitsluitend Europese producenten",
  "Veilig betalen (iDEAL, creditcard, PayPal)",
] as const

export const HOMEPAGE_FOOTER_LINKS = [
  { label: "Over EuropMade", href: "/over" },
  { label: "Klantenservice", href: "/klantenservice" },
  { label: "Verkopen op EuropMade", href: "/partner-onboarding" },
  { label: "Juridisch", href: "/juridisch" },
] as const

export const HOMEPAGE_STORY_LINKS = [
  { label: "Over EuropMade", href: "/over" },
  { label: "Duurzame producten", href: "/duurzaam" },
  { label: "Verified™ uitgelegd", href: "/verified" },
] as const
