/**
 * Redactionele Homepage-content (spec homepage §0.4 / §2).
 * Product-/categoriedata wordt later vervangen door Catalog/Search-API's —
 * geen publieke list-API beschikbaar in de huidige backend.
 */

export type HomepageCategory = {
  slug: string
  label: string
}

export type HomepageProduct = {
  title: string
  priceLabel: string
  ratingLabel: string
  verified: boolean
}

export type HomepageRetailer = {
  name: string
  meta: string
  description: string
}

export const HOMEPAGE_NAV_LINKS = [
  { label: "Categorieën", href: "/categorie" },
  { label: "Tuin", href: "/categorie/tuin" },
  { label: "Elektronica", href: "/categorie/elektronica" },
  { label: "Mode", href: "/categorie/mode" },
  { label: "Over EuropMade", href: "/over" },
] as const

export const HOMEPAGE_CATEGORIES: HomepageCategory[] = [
  { slug: "tuin", label: "Tuin" },
  { slug: "elektronica", label: "Elektronica" },
  { slug: "mode", label: "Mode" },
  { slug: "wonen", label: "Wonen" },
  { slug: "sport", label: "Sport" },
  { slug: "voeding", label: "Voeding" },
]

/** Wireframe-desktop voorbeelden — redactioneel tot Catalog/Search live is. */
export const HOMEPAGE_FEATURED_PRODUCTS: HomepageProduct[] = [
  {
    title: "Robotmaaier X200",
    priceLabel: "Vanaf € 239,00",
    ratingLabel: "★ 4,4 · Gemaakt in Nederland",
    verified: true,
  },
  {
    title: "Tuinslang 20m",
    priceLabel: "Vanaf € 59,95",
    ratingLabel: "★ 4,2 · Gemaakt in Duitsland",
    verified: true,
  },
  {
    title: "Keramische pan-set",
    priceLabel: "Vanaf € 89,00",
    ratingLabel: "★ 4,7 · Gemaakt in Italië",
    verified: true,
  },
  {
    title: "Wollen deken",
    priceLabel: "Vanaf € 45,00",
    ratingLabel: "★ 4,6 · Gemaakt in België",
    verified: true,
  },
]

export const HOMEPAGE_RETAILERS: HomepageRetailer[] = [
  {
    name: "Merknaam BV",
    meta: "★ 4,6 · Nederland",
    description: "Producent van tuingereedschap, actief sinds 2015.",
  },
  {
    name: "Atelier Rossi",
    meta: "★ 4,8 · Italië",
    description: "Keramiek en keukenwaar, familiebedrijf sinds 1962.",
  },
  {
    name: "Wolfabriek B.",
    meta: "★ 4,5 · België",
    description: "Wollen producten, ambachtelijk vervaardigd.",
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
