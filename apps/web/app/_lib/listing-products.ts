/**
 * Redactionele listing-seed (MVP Fase 3) tot Catalog/Search-API gekoppeld is.
 * Geen businesslogica — alleen presentatiedata voor CMP-017.
 */

export type ListingProduct = {
  slug: string
  title: string
  brand: string
  manufacturer?: string
  manufacturerSlug?: string
  seller: string
  categorySlugs: string[]
  priceCents: number
  originalPriceCents?: number
  offerCount: number
  rating: number
  countryCode: string
  countryLabel: string
  verified: boolean
  features: string[]
  keywords: string[]
}

function p(
  partial: Omit<ListingProduct, "keywords"> & { keywords?: string[] }
): ListingProduct {
  return {
    ...partial,
    keywords: partial.keywords ?? [
      partial.title,
      partial.brand,
      ...partial.categorySlugs,
      ...partial.features,
    ],
  }
}

/** ~30 producten — wireframe Robotmaaiers + overige categorieën. */
export const LISTING_PRODUCTS: ListingProduct[] = [
  p({
    slug: "robotmaaier-x200",
    title: "Robotmaaier X200",
    brand: "VerdeTech",
    seller: "TuinPro NL",
    categorySlugs: ["tuin", "outdoor"],
    priceCents: 23900,
    originalPriceCents: 29900,
    offerCount: 3,
    rating: 4.4,
    countryCode: "NL",
    countryLabel: "Nederland",
    verified: true,
    features: ["800 m²", "App-bediening"],
  }),
  p({
    slug: "robotmaaier-compact",
    title: "Robotmaaier Compact",
    brand: "VerdeTech",
    seller: "GartenHaus DE",
    categorySlugs: ["tuin"],
    priceCents: 18900,
    offerCount: 1,
    rating: 4.1,
    countryCode: "DE",
    countryLabel: "Duitsland",
    verified: true,
    features: ["400 m²", "Compact"],
  }),
  p({
    slug: "robotmaaier-pro-400",
    title: "Robotmaaier Pro 400",
    brand: "LawnEU",
    seller: "TuinPro NL",
    categorySlugs: ["tuin"],
    priceCents: 34900,
    originalPriceCents: 37900,
    offerCount: 2,
    rating: 4.6,
    countryCode: "NL",
    countryLabel: "Nederland",
    verified: true,
    features: ["1200 m²", "GPS"],
  }),
  p({
    slug: "robotmaaier-mini",
    title: "Robotmaaier Mini",
    brand: "Prato",
    seller: "Casa Verde IT",
    categorySlugs: ["tuin"],
    priceCents: 15900,
    offerCount: 4,
    rating: 4.0,
    countryCode: "IT",
    countryLabel: "Italië",
    verified: true,
    features: ["250 m²"],
  }),
  p({
    slug: "robotmaaier-silent-300",
    title: "Robotmaaier Silent 300",
    brand: "LawnEU",
    seller: "GroenDirect",
    categorySlugs: ["tuin"],
    priceCents: 24900,
    originalPriceCents: 27900,
    offerCount: 2,
    rating: 4.3,
    countryCode: "NL",
    countryLabel: "Nederland",
    verified: true,
    features: ["600 m²", "Stil"],
  }),
  p({
    slug: "tuinslang-20m",
    title: "Tuinslang 20m",
    brand: "AquaFlex",
    seller: "TuinPro NL",
    categorySlugs: ["tuin", "huishouden"],
    priceCents: 5995,
    offerCount: 2,
    rating: 4.2,
    countryCode: "DE",
    countryLabel: "Duitsland",
    verified: true,
    features: ["20 m", "Antiknik"],
  }),
  p({
    slug: "keramische-pan-set",
    title: "Keramische pan-set",
    brand: "Atelier Rossi",
    seller: "KeukenAtelier",
    categorySlugs: ["keuken", "wonen"],
    priceCents: 8900,
    originalPriceCents: 11900,
    offerCount: 3,
    rating: 4.7,
    countryCode: "IT",
    countryLabel: "Italië",
    verified: true,
    features: ["3-delig", "PFAS-vrij"],
  }),
  p({
    slug: "chefmes-damascus",
    title: "Chefmes Damascus 20cm",
    brand: "SolingenWerk",
    seller: "KeukenAtelier",
    categorySlugs: ["keuken"],
    priceCents: 12900,
    offerCount: 2,
    rating: 4.8,
    countryCode: "DE",
    countryLabel: "Duitsland",
    verified: true,
    features: ["20 cm", "Full tang"],
  }),
  p({
    slug: "espressomachine-milano",
    title: "Espressomachine Milano",
    brand: "Caffè Nord",
    seller: "HomeBrew EU",
    categorySlugs: ["keuken", "elektronica"],
    priceCents: 34900,
    originalPriceCents: 39900,
    offerCount: 2,
    rating: 4.5,
    countryCode: "IT",
    countryLabel: "Italië",
    verified: true,
    features: ["15 bar", "Melkopschuimer"],
  }),
  p({
    slug: "wollen-deken",
    title: "Wollen deken",
    brand: "Wolfabriek B.",
    seller: "WoonLijn BE",
    categorySlugs: ["wonen", "slaapkamer"],
    priceCents: 4500,
    offerCount: 1,
    rating: 4.6,
    countryCode: "BE",
    countryLabel: "België",
    verified: true,
    features: ["140×200", "Merinowol"],
  }),
  p({
    slug: "led-bureaulamp",
    title: "LED-bureaulamp Arc",
    brand: "Nordlicht",
    seller: "Licht & Co",
    categorySlugs: ["elektronica", "kantoor", "verlichting"],
    priceCents: 7900,
    originalPriceCents: 9900,
    offerCount: 3,
    rating: 4.3,
    countryCode: "DE",
    countryLabel: "Duitsland",
    verified: true,
    features: ["Dimbaar", "USB-C"],
  }),
  p({
    slug: "draadloze-oordoppen",
    title: "Draadloze oordoppen Pulse",
    brand: "SoundEU",
    seller: "AudioMarkt",
    categorySlugs: ["elektronica"],
    priceCents: 9900,
    offerCount: 4,
    rating: 4.2,
    countryCode: "NL",
    countryLabel: "Nederland",
    verified: true,
    features: ["ANC", "30 u batterij"],
  }),
  p({
    slug: "linnen-overhemd",
    title: "Linnen overhemd Classic",
    brand: "Atelier Nord",
    seller: "Modehuis Lille",
    categorySlugs: ["mode"],
    priceCents: 8900,
    originalPriceCents: 11000,
    offerCount: 2,
    rating: 4.4,
    countryCode: "FR",
    countryLabel: "Frankrijk",
    verified: true,
    features: ["100% linnen", "Regular fit"],
  }),
  p({
    slug: "leren-sneakers",
    title: "Leren sneakers Porto",
    brand: "Calçado",
    seller: "Schoenenhuis PT",
    categorySlugs: ["mode", "schoenen"],
    priceCents: 12900,
    offerCount: 2,
    rating: 4.5,
    countryCode: "PT",
    countryLabel: "Portugal",
    verified: true,
    features: ["Volleer", "Unisex"],
  }),
  p({
    slug: "yogamat-cork",
    title: "Yogamat Cork Grip",
    brand: "MoveEU",
    seller: "SportDirect NL",
    categorySlugs: ["sport", "duurzaam"],
    priceCents: 5900,
    offerCount: 3,
    rating: 4.6,
    countryCode: "ES",
    countryLabel: "Spanje",
    verified: true,
    features: ["Kurk", "4 mm"],
  }),
  p({
    slug: "hardloopschoen-trail",
    title: "Hardloopschoen Trail X",
    brand: "AlpenRun",
    seller: "SportDirect NL",
    categorySlugs: ["sport", "schoenen", "outdoor"],
    priceCents: 13900,
    originalPriceCents: 15900,
    offerCount: 2,
    rating: 4.3,
    countryCode: "AT",
    countryLabel: "Oostenrijk",
    verified: true,
    features: ["Trail", "Gore-Tex"],
  }),
  p({
    slug: "olijfolie-extra-virgin",
    title: "Olijfolie Extra Virgin 500ml",
    brand: "Casa Verde",
    seller: "Proeverij Zuid",
    categorySlugs: ["voeding"],
    priceCents: 1295,
    offerCount: 5,
    rating: 4.7,
    countryCode: "IT",
    countryLabel: "Italië",
    verified: true,
    features: ["Koudgeperst", "Bio"],
  }),
  p({
    slug: "honing-lavendel",
    title: "Lavendelhoning 250g",
    brand: "Abeille Provence",
    seller: "Proeverij Zuid",
    categorySlugs: ["voeding", "cadeaus"],
    priceCents: 895,
    offerCount: 2,
    rating: 4.8,
    countryCode: "FR",
    countryLabel: "Frankrijk",
    verified: true,
    features: ["Rauw", "250 g"],
  }),
  p({
    slug: "castile-zeep",
    title: "Castile zeep Lavendel",
    brand: "PureSoap",
    seller: "BeautyBar EU",
    categorySlugs: ["beauty-verzorging", "huishouden"],
    priceCents: 995,
    offerCount: 2,
    rating: 4.4,
    countryCode: "ES",
    countryLabel: "Spanje",
    verified: true,
    features: ["Vegan", "500 ml"],
  }),
  p({
    slug: "baby-dekbedovertrek",
    title: "Baby dekbedovertrek Organic",
    brand: "LittleEU",
    seller: "Kind & Kamer",
    categorySlugs: ["baby-kind", "slaapkamer"],
    priceCents: 3990,
    offerCount: 1,
    rating: 4.6,
    countryCode: "NL",
    countryLabel: "Nederland",
    verified: true,
    features: ["Biokatoen", "100×135"],
  }),
  p({
    slug: "houten-blokken-set",
    title: "Houten blokken set 50-delig",
    brand: "SpielWerk",
    seller: "Speelgoedhuis DE",
    categorySlugs: ["speelgoed", "baby-kind"],
    priceCents: 4490,
    originalPriceCents: 5490,
    offerCount: 3,
    rating: 4.5,
    countryCode: "DE",
    countryLabel: "Duitsland",
    verified: true,
    features: ["FSC-hout", "3+"],
  }),
  p({
    slug: "hondenmand-vilt",
    title: "Hondenmand Vilt Large",
    brand: "PetNord",
    seller: "Dierenrijk",
    categorySlugs: ["dieren"],
    priceCents: 6900,
    offerCount: 2,
    rating: 4.2,
    countryCode: "SE",
    countryLabel: "Zweden",
    verified: true,
    features: ["Wolvilt", "L"],
  }),
  p({
    slug: "accuboormachine-pro",
    title: "Accuboormachine Pro 18V",
    brand: "WerkzeugEU",
    seller: "KlusDirect",
    categorySlugs: ["klus-gereedschap"],
    priceCents: 15900,
    originalPriceCents: 19900,
    offerCount: 3,
    rating: 4.5,
    countryCode: "DE",
    countryLabel: "Duitsland",
    verified: true,
    features: ["18V", "2 accus"],
  }),
  p({
    slug: "fietsreparatieset",
    title: "Fietsreparatieset Compact",
    brand: "CycleFix",
    seller: "Auto & Fiets NL",
    categorySlugs: ["auto-motor", "sport"],
    priceCents: 2490,
    offerCount: 4,
    rating: 4.1,
    countryCode: "NL",
    countryLabel: "Nederland",
    verified: true,
    features: ["15-delig"],
  }),
  p({
    slug: "notitieboek-linnen",
    title: "Notitieboek Linnen A5",
    brand: "Papierwerk",
    seller: "Kantoorlijn",
    categorySlugs: ["kantoor", "cadeaus"],
    priceCents: 1890,
    offerCount: 2,
    rating: 4.4,
    countryCode: "BE",
    countryLabel: "België",
    verified: true,
    features: ["A5", "120 pagina's"],
  }),
  p({
    slug: "roman-nieuwe-oogst",
    title: "Roman: Nieuwe Oogst",
    brand: "Uitgeverij Horizon",
    seller: "Boekwinkel Centrum",
    categorySlugs: ["boeken-media"],
    priceCents: 2299,
    offerCount: 1,
    rating: 4.3,
    countryCode: "NL",
    countryLabel: "Nederland",
    verified: false,
    features: ["Paperback", "320 p."],
  }),
  p({
    slug: "kruidenapotheek-set",
    title: "Kruidenapotheek starterset",
    brand: "HerbaCare",
    seller: "GezondLeven",
    categorySlugs: ["gezondheid"],
    priceCents: 3490,
    offerCount: 2,
    rating: 4.2,
    countryCode: "AT",
    countryLabel: "Oostenrijk",
    verified: true,
    features: ["6 kruiden", "Bio"],
  }),
  p({
    slug: "hanglamp-eik",
    title: "Hanglamp Eik Ø40",
    brand: "LichtAmbacht",
    seller: "WoonLijn BE",
    categorySlugs: ["verlichting", "wonen", "ambacht"],
    priceCents: 18900,
    offerCount: 1,
    rating: 4.7,
    countryCode: "BE",
    countryLabel: "België",
    verified: true,
    features: ["Eikenhout", "E27"],
  }),
  p({
    slug: "handdoekenset-bad",
    title: "Handdoekenset Bad 4-delig",
    brand: "Linnenhuis",
    seller: "Bad & Comfort",
    categorySlugs: ["badkamer", "huishouden"],
    priceCents: 4990,
    originalPriceCents: 6490,
    offerCount: 2,
    rating: 4.4,
    countryCode: "PT",
    countryLabel: "Portugal",
    verified: true,
    features: ["500 g/m²", "Katoen"],
  }),
  p({
    slug: "bloempot-terracotta",
    title: "Bloempot Terracotta Ø28",
    brand: "Ceramica Sud",
    seller: "Plant & Pot",
    categorySlugs: ["plant-bloem", "wonen"],
    priceCents: 2490,
    offerCount: 3,
    rating: 4.5,
    countryCode: "IT",
    countryLabel: "Italië",
    verified: true,
    features: ["Handgevormd", "Ø28"],
  }),
]

export function findListingProduct(slug: string): ListingProduct | null {
  return LISTING_PRODUCTS.find((p) => p.slug === slug) ?? null
}

/** Homepage “Uitgelicht” — zelfde seed-bron als listing/PDP, geen tweede productlijst. */
const FEATURED_LISTING_SLUGS = [
  "robotmaaier-x200",
  "tuinslang-20m",
  "keramische-pan-set",
  "wollen-deken",
] as const

export function featuredListingProducts(): ListingProduct[] {
  return FEATURED_LISTING_SLUGS.map((slug) => findListingProduct(slug)).filter(
    (p): p is ListingProduct => p != null
  )
}

export function discountPercent(product: ListingProduct): number | null {
  if (!product.originalPriceCents || product.originalPriceCents <= product.priceCents) {
    return null
  }
  return Math.round(
    ((product.originalPriceCents - product.priceCents) / product.originalPriceCents) *
      100
  )
}

export function discountBadgeLabel(product: ListingProduct): string | null {
  const pct = discountPercent(product)
  if (pct == null) return null
  if (pct >= 20) return "Hoge korting"
  if (pct >= 10) return "Korting"
  return null
}

export function formatEuroFromCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

export function starsForRating(rating: number): string {
  const full = Math.round(rating)
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full)
}

export function productsForCategory(categorySlug: string): ListingProduct[] {
  return LISTING_PRODUCTS.filter((p) => p.categorySlugs.includes(categorySlug))
}

export function productsForSearch(query: string): ListingProduct[] {
  const q = query.trim().toLowerCase()
  if (!q) return LISTING_PRODUCTS
  return LISTING_PRODUCTS.filter((p) =>
    p.keywords.some((k) => k.toLowerCase().includes(q)) ||
    p.title.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.seller.toLowerCase().includes(q)
  )
}
