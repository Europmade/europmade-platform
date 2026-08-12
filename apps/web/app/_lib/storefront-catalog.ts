/**
 * Storefront-data: uitsluitend Product/Commerce Cloud met geldige offers.
 */

import {
  CatalogApiError,
  getCatalogBrand,
  getCatalogManufacturer,
  getCatalogProduct,
  listCatalogProducts,
  type CatalogBrandPage,
  type CatalogListProduct,
  type CatalogManufacturerPage,
  type CatalogProductDetail,
} from "./catalog-api"
import { slugifyForManufacturer } from "./manufacturer-slug"
import { type ListingProduct } from "./listing-products"
import {
  findMarketplaceCategory,
  MARKETPLACE_CATEGORIES,
} from "./marketplace-categories"
import { type PdpDetail, type PdpOffer, type PdpReview } from "./pdp-seed"
import {
  FREE_SHIPPING_SENTINEL,
  resolveOfferDeliveryLabel,
} from "./offer-delivery"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "./i18n/locales"
import {
  categoryNavLabel,
  countryDisplayLabel,
  t,
  tFormat,
} from "./i18n/messages"

export type DataSource = "api"

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

function mapListItem(
  item: CatalogListProduct,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): ListingProduct {
  const countryCode = (item.country_code ?? "EU").toUpperCase()
  const priceEuros = item.from_price ?? 0
  const manufacturerName = item.manufacturer_name?.trim()
  return {
    slug: item.id,
    title: item.title,
    brand: item.brand_name ?? t("brand", locale),
    manufacturer: manufacturerName || undefined,
    manufacturerSlug: manufacturerName
      ? slugifyForManufacturer(manufacturerName)
      : undefined,
    seller:
      item.offer_count > 0
        ? item.offer_count === 1
          ? t("sellersOne", locale)
          : tFormat("sellersMany", locale, { count: item.offer_count })
        : t("noSellersYet", locale),
    categorySlugs: categorySlugsFromNames(item.category_names),
    priceCents: eurosToCents(priceEuros),
    offerCount: item.offer_count,
    rating: item.average_review_score ?? 0,
    countryCode,
    countryLabel: countryDisplayLabel(countryCode, locale),
    verified: item.lifecycle_status === "Verified™",
    features: item.category_names.slice(0, 2),
    keywords: [
      item.title,
      item.brand_name ?? "",
      manufacturerName ?? "",
      ...item.category_names,
      item.identifier_value ?? "",
    ].filter(Boolean),
  }
}

function hasValidCommerceOffer(item: CatalogListProduct): boolean {
  return item.offer_count > 0 && item.from_price != null && item.from_price > 0
}

async function toStorefrontProducts(
  items: CatalogListProduct[],
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
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
        return hasUsableOffer ? mapListItem(item, locale) : null
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
  brand?: string
  manufacturer?: string
  country?: string
  priceMin?: number
  priceMax?: number
  verified?: boolean
  sort?: "popularity" | "price_asc" | "price_desc" | "rating_desc" | "name_asc" | "name_desc"
  offset?: number
  limit?: number
  locale?: StorefrontLocale
}): Promise<{ products: ListingProduct[]; count: number; source: DataSource }> {
  const locale = opts?.locale ?? DEFAULT_STOREFRONT_LOCALE
  try {
    const categoryLabel = opts?.categorySlug
      ? findMarketplaceCategory(opts.categorySlug)?.label
      : undefined
    const res = await listCatalogProducts({
      category: categoryLabel,
      q: opts?.query,
      brand: opts?.brand,
      manufacturer: opts?.manufacturer,
      country: opts?.country,
      price_min: opts?.priceMin,
      price_max: opts?.priceMax,
      verified: opts?.verified,
      sort: opts?.sort,
      offset: opts?.offset,
      limit: opts?.limit,
    })
    return {
      products: res.products
        .filter(hasValidCommerceOffer)
        .map((item) => mapListItem(item, locale)),
      count: res.count,
      source: "api",
    }
  } catch (err) {
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] list failed", err)
    }
    return { products: [], count: 0, source: "api" }
  }
}

export async function resolveFeaturedProducts(
  limit = 4,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): Promise<ListingProduct[]> {
  const { products } = await resolveListingProducts({ locale })
  return [...products]
    .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
    .slice(0, limit)
}

export type ProducerPageData = {
  manufacturer: CatalogManufacturerPage["manufacturer"]
  products: ListingProduct[]
}

export type BrandPageData = {
  brand: CatalogBrandPage["brand"]
  products: ListingProduct[]
}

export async function resolveBrandPage(
  slug: string,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): Promise<BrandPageData | null> {
  try {
    const page = await getCatalogBrand(slug, {
      region_code: "NL",
      locale,
    })
    return {
      brand: page.brand,
      products: page.products
        .filter(hasValidCommerceOffer)
        .map((item) => mapListItem(item, locale)),
    }
  } catch (err) {
    if (err instanceof CatalogApiError && err.status === 404) return null
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] brand page failed", err)
    }
    return null
  }
}

export async function resolveProducerPage(
  slug: string,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): Promise<ProducerPageData | null> {
  try {
    const page = await getCatalogManufacturer(slug)
    return {
      manufacturer: page.manufacturer,
      products: page.products
        .filter(hasValidCommerceOffer)
        .map((item) => mapListItem(item, locale)),
    }
  } catch (err) {
    if (err instanceof CatalogApiError && err.status === 404) return null
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] producer page failed", err)
    }
    return null
  }
}

function localizeCategoryNames(
  names: string[],
  locale: StorefrontLocale
): string {
  if (names.length === 0) return t("catAlgemeen", locale)
  return names
    .map((name) => {
      const slug = categorySlugFromName(name)
      return slug ? categoryNavLabel(slug, name, locale) : name
    })
    .join(", ")
}

function currencyLocale(locale: StorefrontLocale): string {
  switch (locale) {
    case "en":
      return "en-GB"
    case "de":
      return "de-DE"
    case "fr":
      return "fr-FR"
    default:
      return "nl-NL"
  }
}

function mapReviews(
  rows: CatalogProductDetail["reviews"],
  locale: StorefrontLocale
): PdpReview[] {
  return rows.slice(0, 8).map((r) => ({
    stars: Math.round(Number(r.score)),
    excerpt: r.text?.trim() || t("noReviewComment", locale),
    verified: true,
  }))
}

function mapOffers(
  detail: CatalogProductDetail,
  locale: StorefrontLocale
): PdpOffer[] {
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
    delivery: resolveOfferDeliveryLabel(
      {
        shipping_cost: o.shipping_cost,
        quantity_available: o.quantity_available,
        delivery_score: deliveryScoreByOffer.get(o.offer_id) ?? null,
      },
      locale
    ),
    shipping:
      o.shipping_cost <= 0
        ? FREE_SHIPPING_SENTINEL
        : new Intl.NumberFormat(currencyLocale(locale), {
            style: "currency",
            currency: "EUR",
          }).format(o.shipping_cost),
    returns: t("trust30DayReturn", locale),
    stock:
      o.quantity_available > 5
        ? t("inStock", locale)
        : o.quantity_available > 0
          ? t("lowStock", locale)
          : t("outOfStock", locale),
    selected: hasWinner ? o.is_winner : index === 0,
  }))
}

async function mapApiDetail(
  detail: CatalogProductDetail,
  locale: StorefrontLocale
): Promise<PdpDetail> {
  const p = detail.product
  const listing = mapListItem(
    {
      id: p.id,
      title: p.title,
      description: p.description,
      lifecycle_status: p.lifecycle_status,
      brand_name: p.brand_name,
      manufacturer_id: null,
      manufacturer_name: p.manufacturer_name,
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
          ? detail.reviews.reduce((s, r) => s + r.score, 0) /
            detail.reviews.length
          : null,
      review_count: detail.reviews.length,
    },
    locale
  )
  listing.countryLabel = countryDisplayLabel(listing.countryCode, locale)

  const catSlug = listing.categorySlugs[0]
  const cat = findMarketplaceCategory(catSlug)
  const paragraphs = (p.description || "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
  const offers = mapOffers(detail, locale)
  const productReviews = mapReviews(detail.reviews, locale)
  const sellerReviews = mapReviews(detail.seller_reviews, locale)

  let related: ListingProduct[] = []
  try {
    const relatedList = await listCatalogProducts({
      category: p.category_names[0],
    })
    related = await toStorefrontProducts(relatedList.products, locale)
      .filter((x) => x.slug !== p.id && x.categorySlugs.includes(catSlug))
      .slice(0, 5)
  } catch {
    related = []
  }

  const categoryDisplay = localizeCategoryNames(p.category_names, locale)

  return {
    slug: p.id,
    listing,
    fullTitle: p.title,
    breadcrumb: [
      { label: t("breadcrumbHome", locale), href: "/" },
      {
        label: cat
          ? categoryNavLabel(cat.slug, cat.label, locale)
          : p.category_names[0] ?? t("categoryWord", locale),
        href: cat ? `/categorie/${cat.slug}` : undefined,
      },
      { label: p.title },
    ],
    reviewCount: detail.reviews.length,
    manufacturer: p.manufacturer_name ?? p.brand_name ?? t("producer", locale),
    euOwnershipPercent: 100,
    intro:
      paragraphs[0] ??
      `${p.title}${p.brand_name ? ` — ${p.brand_name}` : ""}.`,
    highlights:
      p.category_names.length > 0
        ? localizeCategoryNames(p.category_names.slice(0, 4), locale).split(", ")
        : [`${t("brandLabel", locale)} ${p.brand_name ?? "—"}`],
    suitableFor: [
      `${t("categoryWord", locale)}: ${categoryDisplay}`,
      t("euMarketplaceLine", locale),
    ],
    descriptionParagraphs:
      paragraphs.length > 0
        ? paragraphs
        : [
            tFormat("descriptionAvailableVia", locale, { title: p.title }),
            t("descriptionBuyBoxAuto", locale),
          ],
    specs: [
      { label: t("brand", locale), value: p.brand_name ?? "—" },
      {
        label: t("producer", locale),
        value: p.manufacturer_name ?? p.brand_name ?? "—",
      },
      { label: t("country", locale), value: listing.countryLabel },
      {
        label: t("identifier", locale),
        value: p.identifier_value
          ? `${p.identifier_type ?? "ID"} ${p.identifier_value}`
          : "—",
      },
    ],
    downloads: [],
    colorVariants: [{ id: "c-default", color: "#2c2c2c" }],
    sizeVariants: [{ id: "s-default", label: t("sizeStandard", locale) }],
    selectedColorId: "c-default",
    selectedSizeId: "s-default",
    offers,
    buyBoxNotice: t("buyBoxNotice", locale),
    productReviews:
      productReviews.length > 0
        ? productReviews
        : [{ stars: 0, excerpt: t("noProductReviewsYet", locale), verified: false }],
    sellerReviews:
      sellerReviews.length > 0
        ? sellerReviews
        : [
            {
              stars: 0,
              excerpt: t("noSellerReviews", locale),
              verified: false,
            },
          ],
    sellerReviewCount: detail.seller_review_aggregate.count,
    sellerReviewAvg: detail.seller_review_aggregate.average_score ?? 0,
    faqs: [
      {
        q: t("howOfferChosen", locale),
        a: t("howOfferChosenAnswer", locale),
      },
      {
        q: t("whoSellsProduct", locale),
        a: t("whoSellsProductAnswer", locale),
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
  slug: string,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
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
      detail: await mapApiDetail({ ...api, offers: validOffers }, locale),
      source: "api",
    }
  } catch {
    // Niet zichtbaar op storefront zonder geldige Commerce Cloud-offers.
    return null
  }
}
