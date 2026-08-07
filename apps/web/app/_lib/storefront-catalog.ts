/**
 * Storefront-data: uitsluitend Product/Commerce Cloud met geldige offers.
 */

import {
  CatalogApiError,
  getCatalogProduct,
  listCatalogProducts,
  type CatalogListProduct,
  type CatalogProductDetail,
} from "./catalog-api"
import { type ListingProduct } from "./listing-products"
import {
  findMarketplaceCategory,
  MARKETPLACE_CATEGORIES,
} from "./marketplace-categories"
import { type PdpDetail, type PdpOffer, type PdpReview } from "./pdp-seed"
import { resolveOfferDeliveryLabel } from "./offer-delivery"

export type DataSource = "api"

const COUNTRY_LABELS: Record<string, string> = {
  NL: "Nederland",
  DE: "Duitsland",
  BE: "België",
  FR: "Frankrijk",
  IT: "Italië",
  ES: "Spanje",
  PL: "Polen",
  AT: "Oostenrijk",
  SE: "Zweden",
  DK: "Denemarken",
  IE: "Ierland",
  PT: "Portugal",
  FI: "Finland",
  EU: "Europa",
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

async function isCheckoutReadyOffer(offerId: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2_500)
  try {
    const response = await fetch(
      `${BACKEND_URL}/store/order-service/checkout/revalidate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
        body: JSON.stringify({
          lines: [{ offer_id: offerId, quantity: 1 }],
        }),
        next: { revalidate: 10 },
        signal: controller.signal,
      }
    )
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function categorySlugFromName(name: string): string | null {
  const lower = name.toLowerCase()
  const exact = MARKETPLACE_CATEGORIES.find(
    (c) => c.label.toLowerCase() === lower
  )
  if (exact) return exact.slug
  const partial = MARKETPLACE_CATEGORIES.find(
    (c) =>
      lower.includes(c.label.toLowerCase()) ||
      c.label.toLowerCase().includes(lower)
  )
  if (partial) return partial.slug
  if (lower.includes("tuin")) return "tuin"
  if (lower.includes("keuken")) return "keuken"
  if (lower.includes("elektron")) return "elektronica"
  if (lower.includes("mode") || lower.includes("kleding")) return "mode"
  if (lower.includes("woon")) return "wonen"
  if (lower.includes("sport")) return "sport"
  if (lower.includes("voeding") || lower.includes("food")) return "voeding"
  return null
}

function categorySlugsFromNames(names: string[]): string[] {
  const slugs: string[] = []
  for (const name of names) {
    const slug = categorySlugFromName(name)
    if (slug && !slugs.includes(slug)) slugs.push(slug)
  }
  return slugs.length ? slugs : ["algemeen"]
}

function mapListItem(item: CatalogListProduct): ListingProduct {
  const countryCode = (item.country_code ?? "EU").toUpperCase()
  const priceEuros = item.from_price ?? 0
  return {
    slug: item.id,
    title: item.title,
    brand: item.brand_name ?? "Merk",
    seller:
      item.offer_count > 0
        ? `${item.offer_count} aanbieder${item.offer_count === 1 ? "" : "s"}`
        : "Nog geen aanbieders",
    categorySlugs: categorySlugsFromNames(item.category_names),
    priceCents: eurosToCents(priceEuros),
    offerCount: item.offer_count,
    rating: item.average_review_score ?? 0,
    countryCode,
    countryLabel: COUNTRY_LABELS[countryCode] ?? countryCode,
    verified: false,
    features: item.category_names.slice(0, 2),
    keywords: [
      item.title,
      item.brand_name ?? "",
      ...item.category_names,
      item.identifier_value ?? "",
    ].filter(Boolean),
  }
}

function hasValidCommerceOffer(item: CatalogListProduct): boolean {
  return item.offer_count > 0 && item.from_price != null && item.from_price > 0
}

async function toStorefrontProducts(
  items: CatalogListProduct[]
): Promise<ListingProduct[]> {
  const coarse = items.filter(hasValidCommerceOffer)
  const checks = await Promise.all(
    coarse.map(async (item) => {
      try {
        const detail = await getCatalogProduct(item.id)
        const candidates = detail.offers.filter(
          (o) => o.offer_id.startsWith("offr_") && Number(o.quantity_available) > 0
        )
        let hasUsableOffer = false
        for (const offer of candidates) {
          if (await isCheckoutReadyOffer(offer.offer_id)) {
            hasUsableOffer = true
            break
          }
        }
        return hasUsableOffer ? mapListItem(item) : null
      } catch {
        return null
      }
    })
  )
  return checks.filter((p): p is ListingProduct => p != null)
}

/**
 * Listing: producten met geldige Commerce Cloud-offers (weergave).
 * Checkout-revalidate blijft op PDP/cart — niet op homepage-lijsten.
 */
export async function resolveListingProducts(opts?: {
  categorySlug?: string
  query?: string
}): Promise<{ products: ListingProduct[]; source: DataSource }> {
  try {
    const categoryLabel = opts?.categorySlug
      ? findMarketplaceCategory(opts.categorySlug)?.label
      : undefined
    const res = await listCatalogProducts({
      category: categoryLabel,
      q: opts?.query,
    })
    return {
      products: res.products.filter(hasValidCommerceOffer).map(mapListItem),
      source: "api",
    }
  } catch (err) {
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] list failed", err)
    }
    return { products: [], source: "api" }
  }
}

export async function resolveFeaturedProducts(limit = 4): Promise<ListingProduct[]> {
  const { products } = await resolveListingProducts()
  return [...products]
    .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
    .slice(0, limit)
}

function mapReviews(rows: CatalogProductDetail["reviews"]): PdpReview[] {
  return rows.slice(0, 8).map((r) => ({
    stars: Math.round(Number(r.score)),
    excerpt: r.text?.trim() || "Geen toelichting.",
    verified: true,
  }))
}

function mapOffers(detail: CatalogProductDetail): PdpOffer[] {
  if (detail.offers.length === 0) return []
  const commerceOffers = detail.offers.filter((o) =>
    o.offer_id.startsWith("offr_")
  )
  const hasWinner = commerceOffers.some((o) => o.is_winner)

  const deliveryScoreByOffer = new Map<string, number>()
  const ranked = detail.buy_box?.ranked
  if (Array.isArray(ranked)) {
    for (const row of ranked) {
      if (!row || typeof row !== "object") continue
      const r = row as {
        offer_id?: string
        factor_scores?: { delivery?: number }
      }
      if (
        typeof r.offer_id === "string" &&
        r.factor_scores?.delivery != null &&
        Number.isFinite(Number(r.factor_scores.delivery))
      ) {
        deliveryScoreByOffer.set(r.offer_id, Number(r.factor_scores.delivery))
      }
    }
  }

  return commerceOffers.map((o, index) => ({
    id: o.offer_id,
    retailer: o.seller_name,
    rating: detail.seller_review_aggregate.average_score ?? 0,
    priceCents: eurosToCents(o.total_price),
    delivery: resolveOfferDeliveryLabel({
      shipping_cost: o.shipping_cost,
      quantity_available: o.quantity_available,
      delivery_score: deliveryScoreByOffer.get(o.offer_id) ?? null,
    }),
    shipping:
      o.shipping_cost <= 0
        ? "Gratis"
        : new Intl.NumberFormat("nl-NL", {
            style: "currency",
            currency: "EUR",
          }).format(o.shipping_cost),
    returns: "30 dagen",
    stock:
      o.quantity_available > 5
        ? "Op voorraad"
        : o.quantity_available > 0
          ? "Lage voorraad"
          : "Niet op voorraad",
    selected: hasWinner ? o.is_winner : index === 0,
  }))
}

async function mapApiDetail(detail: CatalogProductDetail): Promise<PdpDetail> {
  const p = detail.product
  const listing = mapListItem({
    id: p.id,
    title: p.title,
    description: p.description,
    lifecycle_status: p.lifecycle_status,
    brand_name: p.brand_name,
    category_names: p.category_names,
    identifier_id: p.identifier_id,
    identifier_type: p.identifier_type,
    identifier_value: p.identifier_value,
    country_code: p.country_code,
    offer_count: detail.offers.length,
    from_price:
      detail.offers.find((o) => o.is_winner)?.total_price ??
      detail.offers[0]?.total_price ??
      null,
    average_review_score:
      detail.reviews.length > 0
        ? detail.reviews.reduce((s, r) => s + r.score, 0) / detail.reviews.length
        : null,
    review_count: detail.reviews.length,
  })

  const catSlug = listing.categorySlugs[0]
  const cat = findMarketplaceCategory(catSlug)
  const paragraphs = (p.description || "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
  const offers = mapOffers(detail)
  const productReviews = mapReviews(detail.reviews)
  const sellerReviews = mapReviews(detail.seller_reviews)

  let related: ListingProduct[] = []
  try {
    const relatedList = await listCatalogProducts({
      category: p.category_names[0],
    })
    related = await toStorefrontProducts(relatedList.products)
      .filter((x) => x.slug !== p.id && x.categorySlugs.includes(catSlug))
      .slice(0, 5)
  } catch {
    related = []
  }

  return {
    slug: p.id,
    listing,
    fullTitle: p.title,
    breadcrumb: [
      { label: "Home", href: "/" },
      {
        label: cat?.label ?? p.category_names[0] ?? "Categorie",
        href: cat ? `/categorie/${cat.slug}` : undefined,
      },
      { label: p.title },
    ],
    reviewCount: detail.reviews.length,
    manufacturer: p.manufacturer_name ?? p.brand_name ?? "Producent",
    euOwnershipPercent: 100,
    intro:
      paragraphs[0] ??
      `${p.title}${p.brand_name ? ` van ${p.brand_name}` : ""}.`,
    highlights:
      p.category_names.length > 0
        ? p.category_names.slice(0, 4)
        : [`Merk: ${p.brand_name ?? "—"}`],
    suitableFor: [
      `Categorie: ${p.category_names.join(", ") || "Algemeen"}`,
      "Europese marketplace EuropMade",
    ],
    descriptionParagraphs:
      paragraphs.length > 0
        ? paragraphs
        : [
            `${p.title} is beschikbaar via onafhankelijke aanbieders op EuropMade.`,
            "De Buy Box selecteert automatisch de beste totale aanbieding voor de klant.",
          ],
    specs: [
      { label: "Merk", value: p.brand_name ?? "—" },
      {
        label: "Producent",
        value: p.manufacturer_name ?? p.brand_name ?? "—",
      },
      { label: "Land", value: listing.countryLabel },
      {
        label: "Identifier",
        value: p.identifier_value
          ? `${p.identifier_type ?? "ID"} ${p.identifier_value}`
          : "—",
      },
    ],
    downloads: [],
    colorVariants: [{ id: "c-default", color: "#2c2c2c" }],
    sizeVariants: [{ id: "s-default", label: "Standaard" }],
    selectedColorId: "c-default",
    selectedSizeId: "s-default",
    offers,
    buyBoxNotice:
      "Beste totale aanbieding op prijs, levertijd, score en voorraad.",
    productReviews:
      productReviews.length > 0
        ? productReviews
        : [{ stars: 0, excerpt: "Nog geen productreviews.", verified: false }],
    sellerReviews:
      sellerReviews.length > 0
        ? sellerReviews
        : [
            {
              stars: 0,
              excerpt: "Nog geen verkopersreviews voor deze aanbieder.",
              verified: false,
            },
          ],
    sellerReviewCount: detail.seller_review_aggregate.count,
    sellerReviewAvg: detail.seller_review_aggregate.average_score ?? 0,
    faqs: [
      {
        q: "Hoe wordt de aanbieding gekozen?",
        a: "De Buy Box rangschikt aanbiedingen server-side op totale klantwaarde (prijs, levertijd, reviews, voorraad, prestaties, retouren).",
      },
      {
        q: "Wie verkoopt dit product?",
        a: "Onafhankelijke retailers op EuropMade. EuropMade verkoopt zelf nooit producten.",
      },
    ],
    pairsWellWith: related.slice(0, 4).map((r) => ({
      slug: r.slug,
      title: r.title,
      priceCents: r.priceCents,
    })),
    relatedSlugs: related.map((r) => r.slug),
    galleryCount: 1,
  }
}

/**
 * PDP: product-id → catalog API; anders seed-slug.
 */
export async function resolvePdpDetail(
  slug: string
): Promise<{ detail: PdpDetail; source: DataSource } | null> {
  try {
    const api = await getCatalogProduct(slug)
    const validOffers = []
    for (const offer of api.offers) {
      if (!offer.offer_id.startsWith("offr_")) continue
      if (Number(offer.quantity_available) <= 0) continue
      if (await isCheckoutReadyOffer(offer.offer_id)) {
        validOffers.push(offer)
      }
    }
    if (validOffers.length === 0) return null
    return {
      detail: await mapApiDetail({ ...api, offers: validOffers }),
      source: "api",
    }
  } catch {
    // Niet zichtbaar op storefront zonder geldige Commerce Cloud-offers.
    return null
  }
}
