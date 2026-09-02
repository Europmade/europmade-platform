/**
 * PDP seed-detail bovenop listing-products — redactioneel tot Catalog/Commerce-API.
 * Structuur volgt 01-productpagina-buybox wireframe.
 */

import {
  formatEuroFromCents,
  LISTING_PRODUCTS,
  findListingProduct,
  type ListingProduct,
} from "./listing-products"
import { findMarketplaceCategory } from "./marketplace-categories"

export type PdpOffer = {
  id: string
  retailer: string
  rating: number
  priceCents: number
  delivery: string
  shipping: string
  returns: string
  stock: string
  selected: boolean
}

export type PdpReview = {
  stars: number
  excerpt: string
  verified: boolean
  retailer?: string
}

export type PdpMadeInEurope = {
  is_made_in_europe: boolean
  score: number | null
  assembly_points: number
  parts_points: number
  materials_points: number
  max_assembly: number
  max_parts: number
  max_materials: number
  assembly_eu_band: string
  parts_eu_level: string
  materials_eu_level: string
  primary_assembly_country: string | null
  facility: {
    id: string
    name: string
    country_code: string
    region: string | null
  } | null
}

export type PdpDetail = {
  slug: string
  listing: ListingProduct
  fullTitle: string
  breadcrumb: { label: string; href?: string }[]
  reviewCount: number
  manufacturer: string
  euOwnershipPercent: number
  madeInEurope?: PdpMadeInEurope | null
  intro: string
  highlights: string[]
  suitableFor: string[]
  descriptionParagraphs: string[]
  specs: { label: string; value: string }[]
  downloads: { label: string; filename: string }[]
  colorVariants: { id: string; color: string; disabled?: boolean }[]
  sizeVariants: { id: string; label: string }[]
  selectedColorId: string
  selectedSizeId: string
  offers: PdpOffer[]
  buyBoxNotice: string
  productReviews: PdpReview[]
  sellerReviews: PdpReview[]
  sellerReviewCount: number
  sellerReviewAvg: number
  faqs: { q: string; a: string }[]
  pairsWellWith: { slug: string; title: string; priceCents: number }[]
  relatedSlugs: string[]
  galleryCount: number
  galleryImages?: string[]
  gallerySlides?: PdpGallerySlide[]
}

export type PdpGallerySlide =
  | {
      kind: "image"
      url: string
      srcSet?: string | null
      avifSrcSet?: string | null
      isPrimary?: boolean
      loading?: "eager" | "lazy"
    }
  | {
      kind: "video"
      embedUrl: string
      provider?: string | null
    }

function baseOffers(_product: ListingProduct): PdpOffer[] {
  // Geen placeholder Offer-ID's — Buy Box/cart alleen met echte Commerce Cloud offr_* (ADR-0022).
  return []
}

function buildDefaultDetail(product: ListingProduct): PdpDetail {
  const cat = findMarketplaceCategory(product.categorySlugs[0])
  const related = LISTING_PRODUCTS.filter(
    (p) =>
      p.slug !== product.slug &&
      p.categorySlugs.some((c) => product.categorySlugs.includes(c))
  ).slice(0, 5)
  const accessories = LISTING_PRODUCTS.filter(
    (p) => p.slug !== product.slug && !related.some((r) => r.slug === p.slug)
  ).slice(0, 4)

  return {
    slug: product.slug,
    listing: product,
    fullTitle: `${product.title}`,
    breadcrumb: [
      { label: "Home", href: "/" },
      {
        label: cat?.label ?? "Categorie",
        href: `/categorie/${product.categorySlugs[0]}`,
      },
      { label: product.title },
    ],
    reviewCount: Math.max(12, Math.round(product.rating * 80)),
    manufacturer: product.brand,
    euOwnershipPercent: product.verified ? 100 : 80,
    intro: `${product.title} van ${product.brand}, geproduceerd in ${product.countryLabel}. ${product.features.join(", ")}.`,
    highlights: product.features.length
      ? product.features.map((f) => f)
      : [`Merk: ${product.brand}`, `Gemaakt in ${product.countryLabel}`],
    suitableFor: [
      `Gebruik in de categorie ${cat?.label ?? "producten"}`,
      "Dagelijkse toepassing thuis",
      "Europese productieketen",
    ],
    descriptionParagraphs: [
      `${product.title} is ontworpen en geproduceerd in Europa (${product.countryLabel}). Het product combineert ${product.features.slice(0, 2).join(" en ") || "kwaliteit en duurzaamheid"} met een heldere herkomstclaim.`,
      `Verkocht via onafhankelijke aanbieders op EuropMade. De Buy Box selecteert automatisch de beste totale aanbieding voor de klant — nooit op basis van advertenties of commissies.`,
      `${product.brand} levert producentgarantie en Europese klantenservice.`,
    ],
    specs: [
      { label: "Merk", value: product.brand },
      { label: "Producent", value: product.brand },
      { label: "Land van productie", value: product.countryLabel },
      { label: "Kenmerken", value: product.features.join(", ") || "—" },
    ],
    downloads: [
      { label: "Handleiding (PDF)", filename: `handleiding-${product.slug}.pdf` },
      {
        label: "Veiligheidsinformatie (PDF)",
        filename: `veiligheid-${product.slug}.pdf`,
      },
      {
        label: "Conformiteitsverklaring (PDF)",
        filename: `conformiteit-${product.slug}.pdf`,
      },
    ],
    colorVariants: [
      { id: "c-dark", color: "#2c2c2c" },
      { id: "c-mid", color: "#8a8a8a" },
      { id: "c-light", color: "#cccccc", disabled: true },
    ],
    sizeVariants: product.features.slice(0, 3).map((f, i) => ({
      id: `s-${i}`,
      label: f,
    })),
    selectedColorId: "c-dark",
    selectedSizeId: "s-0",
    offers: baseOffers(product),
    buyBoxNotice:
      "Beste totale aanbieding op prijs, levertijd, score en voorraad.",
    productReviews: [
      {
        stars: 5,
        excerpt: `Uitstekende kwaliteit van de ${product.title}.`,
        verified: true,
      },
      {
        stars: 4,
        excerpt: "Goede prijs-kwaliteitverhouding, snelle levering.",
        verified: true,
      },
    ],
    sellerReviews: [
      {
        stars: 5,
        excerpt: "Snel geleverd, goed verpakt.",
        verified: true,
        retailer: "TuinPro NL",
      },
      {
        stars: 4,
        excerpt: "Reageerde snel op mijn vraag.",
        verified: true,
        retailer: "TuinPro NL",
      },
      {
        stars: 4,
        excerpt: "Netjes verpakt, iets langere levertijd.",
        verified: true,
        retailer: "GartenHaus DE",
      },
    ],
    sellerReviewCount: 1204,
    sellerReviewAvg: 4.6,
    faqs: [
      {
        q: `Is de ${product.title} geschikt voor dagelijks gebruik?`,
        a: "Ja. Zie het tabblad Geschikt voor voor de aanbevolen toepassingen.",
      },
      {
        q: "Hoe lang duurt de levering?",
        a: "Levertijd verschilt per aanbieder — zie Alle aanbieders hierboven.",
      },
      {
        q: "Geldt de garantie ongeacht bij welke aanbieder ik koop?",
        a: "Ja, de producentgarantie geldt ongeacht de gekozen aanbieder.",
      },
    ],
    pairsWellWith: (accessories.length ? accessories : related)
      .slice(0, 4)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        priceCents: p.priceCents,
      })),
    relatedSlugs: related.map((p) => p.slug),
    galleryCount: 4,
  }
}

/** Wireframe-exacte seed voor Robotmaaier X200. */
function robotmaaierDetail(product: ListingProduct): PdpDetail {
  const base = buildDefaultDetail(product)
  return {
    ...base,
    fullTitle: "Productnaam — Robotmaaier X200 Draadloos",
    breadcrumb: [
      { label: "Home", href: "/" },
      { label: "Tuin", href: "/categorie/tuin" },
      { label: "Robotmaaiers", href: "/categorie/tuin" },
      { label: "Draadloos" },
    ],
    reviewCount: 328,
    manufacturer: "Merknaam BV",
    euOwnershipPercent: 100,
    intro:
      "De Robotmaaier X200 maait tot 800 m² gazon volledig automatisch, met app-bediening en een regensensor. Ontworpen en geproduceerd in Nederland, met 2 jaar producentgarantie.",
    highlights: [
      "Werkgebied tot 800 m²",
      "App-bediening incl. planning",
      "Regensensor, automatisch terug naar station",
    ],
    suitableFor: [
      "Tuinen tot 800 m²",
      "Vlak tot licht hellend terrein (tot 35% helling)",
      "Dagelijks of periodiek maaischema via de app",
      "Tuinen met smalle doorgangen (vanaf 60 cm breed)",
      "Gebruik in woonwijken (geluidsarm, ook 's avonds inzetbaar)",
    ],
    descriptionParagraphs: [
      "De Robotmaaier X200 is ontwikkeld voor tuinbezitters die een verzorgd gazon willen zonder er zelf tijd in te steken. Het toestel maait volgens een vooraf ingesteld schema, keert automatisch terug naar het laadstation bij een lage batterijstand, en onderbreekt het maaien bij regen dankzij de ingebouwde regensensor.",
      "Via de bijbehorende app stel je werkgebied, maaischema en maaihoogte in — ook op afstand. Het mes is vervangbaar en de motor is uitgevoerd met een geluidsarm ontwerp (58 dB).",
      "De Robotmaaier X200 wordt ontworpen en geassembleerd in Nederland, met onderdelen van Europese toeleveranciers. Merknaam BV levert 2 jaar producentgarantie en een lokaal bereikbare klantenservice.",
    ],
    specs: [
      { label: "Werkgebied", value: "Tot 800 m²" },
      { label: "Gewicht", value: "9,8 kg" },
      { label: "Batterijduur", value: "75 minuten per lading" },
      { label: "Geluidsniveau", value: "58 dB" },
      { label: "Garantie", value: "2 jaar (producentgarantie)" },
    ],
    sizeVariants: [
      { id: "s-400", label: "400 m²" },
      { id: "s-800", label: "800 m²" },
      { id: "s-1200", label: "1200 m²" },
    ],
    selectedSizeId: "s-800",
    offers: [],
    productReviews: [
      {
        stars: 5,
        excerpt: "Maait het hele gazon in één cycle, stille motor.",
        verified: true,
      },
      {
        stars: 3,
        excerpt: "Batterijduur valt tegen bij grotere tuinen.",
        verified: true,
      },
    ],
    sellerReviews: [
      {
        stars: 5,
        excerpt: "Snel geleverd, goed verpakt.",
        verified: true,
        retailer: "Retailer X",
      },
      {
        stars: 4,
        excerpt: "Reageerde snel op mijn vraag.",
        verified: true,
        retailer: "Retailer X",
      },
      {
        stars: 4,
        excerpt: "Prima service, iets duurder.",
        verified: true,
        retailer: "Retailer Y",
      },
      {
        stars: 3,
        excerpt: "Levering duurde langer dan beloofd.",
        verified: true,
        retailer: "Retailer Z",
      },
    ],
    faqs: [
      {
        q: "Is de Robotmaaier X200 geschikt voor een tuin met veel obstakels?",
        a: "Ja. Via de app markeer je begrenzingen en obstakels.",
      },
      {
        q: "Hoe lang duurt de levering?",
        a: 'Levertijd verschilt per aanbieder — zie "Alle aanbieders" hierboven.',
      },
      {
        q: "Geldt de garantie ongeacht bij welke aanbieder ik koop?",
        a: "Ja, de 2 jaar producentgarantie geldt ongeacht de gekozen aanbieder.",
      },
    ],
    pairsWellWith: [
      { slug: "tuinslang-20m", title: "Vervangmes-set (2 stuks)", priceCents: 2495 },
      { slug: "robotmaaier-compact", title: "Begrenzingskabel 100m", priceCents: 3450 },
      { slug: "robotmaaier-mini", title: "Onderhoudsset robotmaaiers", priceCents: 1900 },
      { slug: "robotmaaier-silent-300", title: "Beschermhoes buitenopslag", priceCents: 2995 },
    ],
  }
}

export function getPdpDetail(slug: string): PdpDetail | null {
  const product = findListingProduct(slug)
  if (!product) return null
  if (slug === "robotmaaier-x200") return robotmaaierDetail(product)
  return buildDefaultDetail(product)
}

export function lowestOfferPriceLabel(detail: PdpDetail): string {
  if (detail.offers.length === 0) return "Geen aanbieding"
  const min = Math.min(...detail.offers.map((o) => o.priceCents))
  return formatEuroFromCents(min)
}

export { formatEuroFromCents }
