/**
 * Homepage V2 — redactionele content (frontend-only).
 */

import {
  POPULAR_MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
} from "./marketplace-categories"

export type HomepageCategory = MarketplaceCategory & {
  /** Optional CMS image; empty uses no visual (no mock/seed). */
  image?: string | null
  categoryId?: string | null
}

export type HomepageRetailer = {
  name: string
  meta: string
  description: string
  /** Publieke partnerpagina (`/partner/[slug]`). */
  slug: string
  country: string
  rating: number
  productCount: number
}

export const HOMEPAGE_NAV_LINKS = [
  { label: "Categorieën", href: "/categorie" },
  { label: "Tuin", href: "/categorie/tuin" },
  { label: "Elektronica", href: "/categorie/elektronica" },
  { label: "Mode", href: "/categorie/mode" },
  { label: "Over EuropMade", href: "/over" },
] as const

export const HOMEPAGE_CATEGORIES: HomepageCategory[] =
  POPULAR_MARKETPLACE_CATEGORIES.map((cat) => ({
    ...cat,
  }))

export const HOMEPAGE_RETAILERS: HomepageRetailer[] = [
  {
    name: "VerdeTech",
    meta: "★ 4,6 · Nederland",
    description: "Producent van tuingereedschap, actief sinds 2015.",
    slug: "verdetech",
    country: "Nederland",
    rating: 4.6,
    productCount: 24,
  },
  {
    name: "Atelier Rossi",
    meta: "★ 4,8 · Italië",
    description: "Keramiek en keukenwaar, familiebedrijf sinds 1962.",
    slug: "atelier-rossi",
    country: "Italië",
    rating: 4.8,
    productCount: 18,
  },
  {
    name: "Wolfabriek B.",
    meta: "★ 4,5 · België",
    description: "Wollen producten, ambachtelijk vervaardigd.",
    slug: "wolfabriek-b",
    country: "België",
    rating: 4.5,
    productCount: 15,
  },
]

export const HOMEPAGE_HERO_TRUST = [
  "Geproduceerd in Europa",
  "Geverifieerde productinformatie",
  "Vergelijk meerdere aanbieders",
  "Veilig betalen",
] as const

export const HOMEPAGE_TRUST_ITEMS = [
  "Verified™ productinformatie",
  "30 dagen retour",
  "Uitsluitend Europese producenten",
  "Veilig betalen (iDEAL, creditcard, PayPal)",
] as const

export const HOMEPAGE_WHY_ITEMS = [
  {
    title: "Alleen Europese productie",
    body: "Geen verborgen import — herkomst is altijd zichtbaar.",
  },
  {
    title: "Officiële producenten",
    body: "Koop bij geverifieerde makers en merken.",
  },
  {
    title: "Meerdere aanbieders vergelijken",
    body: "Kies de beste totale aanbieding voor jou.",
  },
  {
    title: "Transparantie over herkomst",
    body: "Duidelijke productinformatie, Verified™ waar van toepassing.",
  },
] as const

export const HOMEPAGE_FOOTER_COLUMNS = [
  {
    title: "EuropMade",
    links: [
      { label: "Over ons", href: "/over" },
      { label: "Contact", href: "/klantenservice" },
      { label: "Werken bij", href: "/werken-bij" },
    ],
  },
  {
    title: "Klanten",
    links: [
      { label: "Bestellen", href: "/klantenservice#bestellen" },
      { label: "Verzenden", href: "/klantenservice#verzenden" },
      { label: "Retour", href: "/klantenservice#retour" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Verkopen via EuropMade", href: "/waarom-verkopen" },
      { label: "Affiliateprogramma", href: "/affiliate" },
    ],
  },
  {
    title: "Juridisch",
    links: [
      { label: "Privacy", href: "/juridisch#privacy" },
      { label: "Cookies", href: "/juridisch#cookies" },
      { label: "Algemene voorwaarden", href: "/juridisch#voorwaarden" },
    ],
  },
] as const

/** Compacte footer-links (legacy / chrome fallback). */
export const HOMEPAGE_FOOTER_LINKS = [
  { label: "Over EuropMade", href: "/over" },
  { label: "Klantenservice", href: "/klantenservice" },
  { label: "Verkopen op EuropMade", href: "/waarom-verkopen" },
  { label: "Juridisch", href: "/juridisch" },
] as const

export const HOMEPAGE_STORY_LINKS = [
  { label: "Over EuropMade", href: "/over" },
  { label: "Duurzame producten", href: "/duurzaam" },
  { label: "Verified™ uitgelegd", href: "/verified" },
] as const
