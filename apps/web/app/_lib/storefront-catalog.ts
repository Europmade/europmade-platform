/**
 * Storefront-data: uitsluitend Product/Commerce Cloud met geldige offers.
 */

import {
  CatalogApiError,
  getCatalogBrand,
  getCatalogManufacturer,
  getCatalogProduct,
  getCatalogSeller,
  getTestCatalogProducts,
  listCatalogProductRelations,
  listCatalogProducts,
  type CatalogBrandPage,
  type CatalogListProduct,
  type CatalogManufacturerPage,
  type CatalogProductDetail,
  type CatalogSellerPage,
} from "./catalog-api"
import { slugifyForManufacturer } from "./manufacturer-slug"
import { type ListingProduct } from "./listing-products"
import { findMarketplaceCategory } from "./marketplace-categories"
import { categorySlugFromName, localizeCategoryNames } from "./localize-category-names"
import { type PdpDetail, type PdpGallerySlide, type PdpOffer, type PdpReview } from "./pdp-seed"
import {
  isTestCatalogEnabled,
  mergeTestCatalogProducts,
  resolveMediaUrl,
  selectRelatedCategoryProducts,
} from "@europmade/utils"
import {
  buildImageSrcSet,
  resolveOptimizedImageUrl,
} from "@europmade/utils"
import { getPageBackendOrigin } from "./page-backend-origin"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "./i18n/locales"
import { getStorefrontMarketFromRequest } from "./i18n/get-storefront-market"
import type { EuMarketCode } from "@europmade/types"
import type { ProductAvailability } from "@europmade/utils"
import {
  categoryNavLabel,
  countryDisplayLabel,
  t,
  tFormat,
} from "./i18n/messages"
import {
  FREE_SHIPPING_SENTINEL,
  resolveOfferDeliveryLabel,
} from "./offer-delivery"

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
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE,
  backendOrigin: string
): ListingProduct {
  const countryCode = (item.country_code ?? "EU").toUpperCase()
  const priceEuros = item.from_price ?? 0
  const manufacturerName = item.manufacturer_name?.trim()
  return {
    slug: item.id,
    title: item.title,
    description: item.description?.trim() || null,
    brand: item.brand_name?.trim() || "",
    brandId: item.brand_id?.trim() || null,
    brandSlug: item.brand_slug?.trim() || null,
    brandLogoUrl: resolveMediaUrl(item.brand_logo_url ?? null, backendOrigin),
    brandPagePublished: item.brand_page_published === true,
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
    categorySlugs: item.category_slugs?.length
      ? item.category_slugs
      : categorySlugsFromNames(item.category_names),
    priceCents: eurosToCents(priceEuros),
    offerCount: item.offer_count,
    reviewCount: item.review_count ?? 0,
    rating: item.review_count > 0 ? item.average_review_score ?? 0 : 0,
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
    imageUrl: resolveMediaUrl(item.image_url ?? null, backendOrigin),
    specs: (item.attributes ?? []).flatMap((row) => {
      const code = row.code?.trim()
      const value = row.value?.trim()
      if (!code || !value) return []
      return [{ code, value }]
    }),
    publishedAt: item.published_at ?? null,
  }
}

function hasValidCommerceOffer(item: CatalogListProduct): boolean {
  return item.offer_count > 0 && item.from_price != null && item.from_price > 0
}

async function toStorefrontProducts(
  items: CatalogListProduct[],
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE,
  market: EuMarketCode = "NL"
): Promise<ListingProduct[]> {
  const backendOrigin = await getPageBackendOrigin()
  const coarse = items.filter(hasValidCommerceOffer)
  const checks = await Promise.all(
    coarse.map(async (item) => {
      try {
        const detail = await getCatalogProduct(item.id, market)
        const candidates = detail.offers.filter(
          (o) => o.offer_id.startsWith("offr_") && Number(o.quantity_available) > 0
        )
        let winner: (typeof candidates)[number] | null = null
        for (const offer of candidates) {
          if (await isCheckoutReadyOffer(offer.offer_id)) {
            winner = offer
            break
          }
        }
        if (!winner) return null
        const listing = mapListItem(item, locale, backendOrigin)
        const regular = winner.regular_total_price
        const current = winner.total_price
        const onPromo =
          winner.promo_active === true &&
          regular != null &&
          Number.isFinite(regular) &&
          regular > current
        const reviewCount = detail.reviews.length
        return {
          ...listing,
          priceCents: Number.isFinite(current) && current > 0 ? eurosToCents(current) : listing.priceCents,
          regularPriceCents: onPromo && regular != null ? eurosToCents(regular) : null,
          reviewCount,
          rating:
            reviewCount > 0
              ? detail.reviews.reduce((sum, review) => sum + Number(review.score), 0) / reviewCount
              : 0,
          buyBoxOfferId: winner.offer_id,
          buyBoxSellerId: winner.seller_id,
          buyBoxSellerName: winner.seller_name,
        }
      } catch {
        return null
      }
    })
  )
  return checks.filter((p): p is ListingProduct => p != null)
}

/**
 * Listing: producten met geldige Commerce Cloud-offers (weergave).
 * De winnende, checkout-klare aanbieding wordt aan de kaart gekoppeld.
 * De winkelwagen controleert bij toevoegen opnieuw.
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
  ids?: string[]
  sort?: "popularity" | "price_asc" | "price_desc" | "rating_desc" | "name_asc" | "name_desc"
  offset?: number
  limit?: number
  includeAttributes?: boolean
  locale?: StorefrontLocale
  market?: EuMarketCode
}): Promise<{ products: ListingProduct[]; count: number; source: DataSource }> {
  const locale = opts?.locale ?? DEFAULT_STOREFRONT_LOCALE
  const market = opts?.market ?? (await getStorefrontMarketFromRequest())
  const backendOrigin = await getPageBackendOrigin()
  try {
    const res = await listCatalogProducts({
      region_code: market,
      category: opts?.categorySlug,
      q: opts?.query,
      ids: opts?.ids,
      brand: opts?.brand,
      manufacturer: opts?.manufacturer,
      country: opts?.country,
      price_min: opts?.priceMin,
      price_max: opts?.priceMax,
      verified: opts?.verified,
      sort: opts?.sort,
      offset: opts?.offset,
      limit: opts?.limit,
      include_attributes: opts?.includeAttributes,
    })
    const mapped = res.products
      .filter(hasValidCommerceOffer)
      .map((item) => mapListItem(item, locale, backendOrigin))
    const offers = await resolveCategoryShelfOffers(
      mapped.map((product) => product.slug),
      market
    )
    return {
      products: mapped.map((product) => withCheckoutOffer(product, offers.get(product.slug))),
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

/**
 * Products linked from this category by a stored Product Cloud relation.
 * A product in the same category without that relation is not included.
 */
export async function resolveRelatedCategoryProducts(opts: {
  sourceProducts: ListingProduct[]
  locale?: StorefrontLocale
  market?: EuMarketCode
}): Promise<{ products: ListingProduct[]; relations: Array<{ from_product_id: string; to_product_id: string; relation_type: string }> }> {
  const sourceIds = opts.sourceProducts.map((product) => product.slug.trim()).filter(Boolean)
  if (sourceIds.length === 0) return { products: [], relations: [] }
  try {
    const { relations } = await listCatalogProductRelations(sourceIds)
    const targetIds = selectRelatedCategoryProducts(
      sourceIds,
      relations,
      relations.map((relation) => ({ id: relation.to_product_id })),
      48
    ).map((target) => target.id)
    if (targetIds.length === 0) return { products: [], relations }
    const listed = await resolveListingProducts({
      ids: targetIds,
      locale: opts.locale,
      market: opts.market,
      limit: targetIds.length,
    })
    return {
      relations,
      products: selectRelatedCategoryProducts(
        sourceIds,
        relations,
        listed.products.map((product) => ({ ...product, id: product.slug })),
        48
      ),
    }
  } catch (err) {
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] related products failed", err)
    }
    return { products: [], relations: [] }
  }
}

/** Alle verkoopbare producten van een categorie, zodat filters niet op één pagina blijven hangen. */
export async function resolveAllCategoryProducts(opts: {
  categorySlug: string
  locale?: StorefrontLocale
  market?: EuMarketCode
}): Promise<{ products: ListingProduct[]; count: number; source: DataSource }> {
  const pageSize = 48
  const first = await resolveListingProducts({
    ...opts,
    sort: "popularity",
    offset: 0,
    limit: pageSize,
    includeAttributes: true,
  })
  const products = [...first.products]
  const seen = new Set(products.map((product) => product.slug))
  let offset = pageSize
  while (offset < first.count && offset < 2000) {
    const next = await resolveListingProducts({
      ...opts,
      sort: "popularity",
      offset,
      limit: pageSize,
      includeAttributes: true,
    })
    if (next.products.length === 0) break
    for (const product of next.products) {
      if (seen.has(product.slug)) continue
      seen.add(product.slug)
      products.push(product)
    }
    offset += pageSize
  }
  return { products, count: products.length, source: first.source }
}

/**
 * Vaste testcatalogus voor categoriepagina's. Leeg zodra de modus uit staat.
 * Prijzen en winkelwagen komen uit de lokale demo-aanbieding.
 */
export async function resolveTestCatalogProducts(
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): Promise<ListingProduct[]> {
  if (!isTestCatalogEnabled()) return []
  try {
    const body = await getTestCatalogProducts()
    if (!body.enabled) return []
    const backendOrigin = await getPageBackendOrigin()
    return body.products.map((item) => {
      const offerId = item.offer_id?.trim() || ""
      const priceCents = eurosToCents(item.from_price ?? 0)
      const hasOffer = offerId.startsWith("offr_") && priceCents > 0
      return {
      slug: item.id,
      title: item.title,
      brand: item.brand_name?.trim() || "",
      brandId: item.brand_id,
      brandSlug: item.brand_slug,
      brandLogoUrl: resolveMediaUrl(item.brand_logo_url, backendOrigin),
      brandPagePublished: false,
      seller: hasOffer ? item.seller_name?.trim() || t("sellersOne", locale) : t("noSellersYet", locale),
      categorySlugs: item.category_slugs,
      priceCents: hasOffer ? priceCents : 0,
      offerCount: hasOffer ? Math.max(1, item.offer_count) : 0,
      buyBoxOfferId: hasOffer ? offerId : null,
      buyBoxSellerId: hasOffer ? item.seller_id ?? null : null,
      buyBoxSellerName: hasOffer ? item.seller_name ?? null : null,
      rating: 0,
      reviewCount: 0,
      countryCode: "EU",
      countryLabel: countryDisplayLabel("EU", locale),
      verified: false,
      features: [],
      keywords: [item.title, item.brand_name ?? "", item.gtin].filter(Boolean),
      imageUrl: resolveMediaUrl(item.image_url, backendOrigin),
      imageUrls: (item.gallery_urls ?? []).flatMap((url) => {
        const resolved = resolveMediaUrl(url, backendOrigin)
        return resolved ? [resolved] : []
      }),
      specs: item.specs.flatMap((spec) => {
        const code = spec.code.trim()
        const value = spec.value.trim()
        if (!code || !value) return []
        return [{ code, value }]
      }),
      testCatalog: !hasOffer,
    }
    })
  } catch (err) {
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] test catalog failed", err)
    }
    return []
  }
}

export { mergeTestCatalogProducts }

function withCheckoutOffer(
  product: ListingProduct,
  offer: CategoryShelfOffer | undefined
): ListingProduct {
  if (!offer) return product
  return {
    ...product,
    priceCents: offer.priceCents > 0 ? offer.priceCents : product.priceCents,
    regularPriceCents: offer.regularPriceCents,
    reviewCount: offer.reviewCount,
    rating: offer.rating ?? 0,
    buyBoxOfferId: offer.offerId,
    buyBoxSellerId: offer.sellerId,
    buyBoxSellerName: offer.sellerName,
  }
}

export type CategoryShelfOffer = {
  offerId: string
  sellerId: string
  sellerName: string
  priceCents: number
  regularPriceCents: number | null
  reviewCount: number
  rating: number | null
}

/** Buy-box offer for the category shelf. Missing or not checkout-ready means no cart button. */
export async function resolveCategoryShelfOffers(
  productIds: string[],
  market: EuMarketCode
): Promise<Map<string, CategoryShelfOffer>> {
  const found = new Map<string, CategoryShelfOffer>()
  await Promise.all(
    productIds.map(async (productId) => {
      try {
        const detail = await getCatalogProduct(productId, market, { cache: "no-store" })
        if (detail.test_catalog) return
        const offers = detail.offers.filter(
          (offer) => offer.offer_id.startsWith("offr_") && Number(offer.quantity_available) > 0
        )
        const winner = offers.find((offer) => offer.is_winner) ?? offers[0]
        if (!winner || !(await isCheckoutReadyOffer(winner.offer_id))) return
        const reviewCount = detail.reviews.length
        const regular = winner.regular_total_price
        const current = winner.total_price
        const onPromo =
          winner.promo_active === true &&
          regular != null &&
          Number.isFinite(regular) &&
          regular > current
        found.set(productId, {
          offerId: winner.offer_id,
          sellerId: winner.seller_id,
          sellerName: winner.seller_name,
          priceCents: eurosToCents(current),
          regularPriceCents: onPromo ? eurosToCents(regular) : null,
          reviewCount,
          rating:
            reviewCount > 0
              ? detail.reviews.reduce((sum, review) => sum + Number(review.score), 0) / reviewCount
              : null,
        })
      } catch {
        /* A product without a readable offer stays in the shelf without a cart button. */
      }
    })
  )
  return found
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
      region_code: await getStorefrontMarketFromRequest(),
      locale,
    })
    const backendOrigin = await getPageBackendOrigin()
    const doc = page.brand.page_document
    return {
      brand: {
        ...page.brand,
        logo_url: resolveMediaUrl(page.brand.logo_url, backendOrigin),
        hero_image_url: resolveMediaUrl(
          page.brand.hero_image_url ?? null,
          backendOrigin
        ),
        story_image_url: resolveMediaUrl(
          page.brand.story_image_url ?? null,
          backendOrigin
        ),
        page_document: {
          category_slugs: doc?.category_slugs ?? [],
          product_ids: doc?.product_ids ?? [],
          extra_sections: (doc?.extra_sections ?? []).map((section) => ({
            ...section,
            image_url: resolveMediaUrl(section.image_url ?? null, backendOrigin),
          })),
        },
      },
      products: page.products
        .filter(hasValidCommerceOffer)
        .map((item) => mapListItem(item, locale, backendOrigin)),
    }
  } catch (err) {
    if (err instanceof CatalogApiError && err.status === 404) return null
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] brand page failed", err)
    }
    return null
  }
}

export async function resolveSellerPage(
  slug: string,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): Promise<{
  seller: CatalogSellerPage["seller"]
  products: ListingProduct[]
} | null> {
  try {
    const page = await getCatalogSeller(slug)
    const backendOrigin = await getPageBackendOrigin()
    return {
      seller: {
        ...page.seller,
        logo_url: resolveMediaUrl(page.seller.logo_url, backendOrigin),
        banner_url: resolveMediaUrl(page.seller.banner_url, backendOrigin),
      },
      products: page.products
        .filter(hasValidCommerceOffer)
        .map((item) => mapListItem(item, locale, backendOrigin)),
    }
  } catch (err) {
    if (err instanceof CatalogApiError && err.status === 404) return null
    return null
  }
}

export async function resolveProducerPage(
  slug: string,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): Promise<ProducerPageData | null> {
  try {
    const page = await getCatalogManufacturer(slug)
    const backendOrigin = await getPageBackendOrigin()
    return {
      manufacturer: page.manufacturer,
      products: page.products
        .filter(hasValidCommerceOffer)
        .map((item) => mapListItem(item, locale, backendOrigin)),
    }
  } catch (err) {
    if (err instanceof CatalogApiError && err.status === 404) return null
    if (!(err instanceof CatalogApiError) && !(err instanceof TypeError)) {
      console.error("[storefront-catalog] producer page failed", err)
    }
    return null
  }
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
    sellerSlug: o.seller_slug || undefined,
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
  locale: StorefrontLocale,
  market?: EuMarketCode
): Promise<PdpDetail> {
  const p = detail.product
  const backendOrigin = await getPageBackendOrigin()
  const testCatalog = detail.test_catalog === true && detail.offers.length === 0
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
    locale,
    backendOrigin
  )
  listing.countryLabel = countryDisplayLabel(listing.countryCode, locale)
  if (testCatalog) {
    listing.testCatalog = true
    listing.priceCents = 0
    listing.offerCount = 0
    listing.seller = t("noSellersYet", locale)
    listing.imageUrl = resolveMediaUrl(p.image_url ?? null, backendOrigin)
    listing.specs = (p.attributes ?? []).flatMap((row) => {
      const code = row.code?.trim()
      const value = row.value?.trim()
      if (!code || !value) return []
      return [{ code, value }]
    })
  }

  const mie = detail.made_in_europe ?? null
  const ownership = detail.european_ownership ?? null

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
  if (!testCatalog) {
    try {
      const relatedList = await listCatalogProducts({
        category: p.category_names[0],
        region_code: market,
        limit: 8,
      })
      related = (await toStorefrontProducts(relatedList.products, locale, market ?? "NL"))
        .filter((x) => x.slug !== p.id && x.categorySlugs.includes(catSlug))
        .slice(0, 5)
    } catch {
      related = []
    }
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
    euOwnershipPercent: null,
    europeanOwnership: ownership
      ? {
          ownership_band: ownership.ownership_band,
          ownership_band_label: ownership.ownership_band_label,
          status: ownership.status,
          verified_by_europmade: ownership.verified_by_europmade,
        }
      : null,
    madeInEurope: mie
      ? {
          is_made_in_europe: mie.is_made_in_europe,
          score: mie.score,
          incomplete: mie.incomplete,
          evidence_approved: mie.evidence_approved,
          production_country_label: mie.production_country_label,
          assembly_points: mie.assembly_points,
          parts_points: mie.parts_points,
          materials_points: mie.materials_points,
          max_assembly: mie.max_assembly,
          max_parts: mie.max_parts,
          max_materials: mie.max_materials,
          assembly_eu_band: mie.assembly_eu_band,
          parts_eu_level: mie.parts_eu_level,
          materials_eu_level: mie.materials_eu_level,
          primary_assembly_country: mie.primary_assembly_country,
          facility: mie.facility,
        }
      : null,
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
        : testCatalog
          ? []
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
      ...((p.attributes || [])
        .filter((row) => String(row.value || "").trim())
        .map((row) => ({
          label: row.name,
          value: row.value,
        })) || []),
    ],
    downloads: [],
    colorVariants: [],
    sizeVariants: [],
    selectedColorId: "",
    selectedSizeId: "",
    productLinkGroup: detail.product_link_group
      ? {
          ...detail.product_link_group,
          members: detail.product_link_group.members.map((m) => ({
            ...m,
            image_url: resolveMediaUrl(m.image_url ?? null, backendOrigin),
          })),
        }
      : null,
    offers,
    availability: detail.availability ?? (offers.length > 0 ? "orderable" : "not_deliverable"),
    alternatives: testCatalog || offers.length > 0 ? [] : related,
    buyBoxNotice: testCatalog ? t("testProductNotForSale", locale) : t("buyBoxNotice", locale),
    productReviews: testCatalog
      ? []
      : productReviews.length > 0
        ? productReviews
        : [{ stars: 0, excerpt: t("noProductReviewsYet", locale), verified: false }],
    sellerReviews: testCatalog
      ? []
      : sellerReviews.length > 0
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
    // Seller-owned FAQ only — no EuropMade platform FAQ seed on the PDP.
    faqs: [],
    sellerFaqs: [],
    pairsWellWith: testCatalog
      ? []
      : related.slice(0, 4).map((r) => ({
          slug: r.slug,
          title: r.title,
          priceCents: r.priceCents,
        })),
    relatedSlugs: related.map((r) => r.slug),
    ...(() => {
      const gallerySlides = buildGallerySlides(detail, backendOrigin)
      return {
        galleryCount: Math.max(gallerySlides.length, 1),
        galleryImages: [],
        gallerySlides,
      }
    })(),
  }
}

function isRenderableGalleryImage(item: CatalogMediaItem): boolean {
  if (item.media_type === "Video") return false
  const meta =
    item.metadata && typeof item.metadata === "object"
      ? (item.metadata as Record<string, unknown>)
      : null
  if (meta?.purpose === "compliance_evidence") return false
  const mime = typeof meta?.mime_type === "string" ? meta.mime_type : ""
  if (mime && !mime.startsWith("image/")) return false
  const ref = (item.storage_reference || "").trim()
  if (!ref) return false
  if (/\.pdf(\?|#|$)/i.test(ref)) return false
  // External product-page / non-image URLs must not become gallery slides.
  if (
    /^https?:\/\//i.test(ref) &&
    !/\.(avif|webp|jpe?g|png|gif)(\?|#|$)/i.test(ref)
  ) {
    return false
  }
  return true
}

/**
 * Same primary source as product cards (`image_url` / Hoofdafbeelding), then
 * remaining gallery images. Primary must lead so CMS thumbnailCount cannot
 * slice it away when it has a late sort_order.
 */
function buildGallerySlides(
  detail: CatalogProductDetail,
  backendOrigin: string
): PdpGallerySlide[] {
  const media = detail.product.media ?? []
  const imageItems = media
    .filter(isRenderableGalleryImage)
    .sort((a, b) => {
      const aPrimary = a.media_type === "Hoofdafbeelding" ? 0 : 1
      const bPrimary = b.media_type === "Hoofdafbeelding" ? 0 : 1
      if (aPrimary !== bPrimary) return aPrimary - bPrimary
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
    })

  const slides: PdpGallerySlide[] = []

  for (const item of imageItems) {
    const isPrimary = item.media_type === "Hoofdafbeelding"
    const url = resolveOptimizedImageUrl(
      item.storage_reference,
      item.metadata,
      backendOrigin,
      { preferTransparent: isPrimary }
    )
    if (!url) continue
    const webpSrcSet =
      buildImageSrcSet(
        item.storage_reference,
        item.metadata,
        backendOrigin,
        "webp"
      ) || undefined
    const avifSrcSet =
      buildImageSrcSet(
        item.storage_reference,
        item.metadata,
        backendOrigin,
        "avif"
      ) || undefined
    slides.push({
      kind: "image",
      url,
      srcSet: webpSrcSet,
      avifSrcSet,
      isPrimary,
      loading: isPrimary ? "eager" : "lazy",
    })
  }

  for (const item of media) {
    if (item.media_type === "Video" && item.embed_url) {
      slides.push({
        kind: "video",
        embedUrl: item.embed_url,
        provider: item.video_provider ?? null,
      })
    }
  }

  if (slides.length === 0 || !slides.some((s) => s.kind === "image" && s.isPrimary)) {
    const fallback = resolveMediaUrl(detail.product.image_url ?? null, backendOrigin)
    if (fallback) {
      const withoutDuplicate = slides.filter(
        (s) => !(s.kind === "image" && s.url === fallback)
      )
      return [
        { kind: "image", url: fallback, isPrimary: true, loading: "eager" },
        ...withoutDuplicate,
      ]
    }
  }

  return slides
}

/**
 * PDP: product-id → catalog API met geldige Commerce Cloud-offers.
 */
export async function resolvePdpDetail(
  slug: string,
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE,
  market?: EuMarketCode
): Promise<{ detail: PdpDetail; source: DataSource } | null> {
  try {
    const region = market ?? (await getStorefrontMarketFromRequest())
    const api = await getCatalogProduct(slug, region, { cache: "no-store" })
    const validOffers = []
    for (const offer of api.offers) {
      if (!offer.offer_id.startsWith("offr_")) continue
      if (Number(offer.quantity_available) <= 0) continue
      if (await isCheckoutReadyOffer(offer.offer_id)) {
        validOffers.push(offer)
      }
    }
    const availability: ProductAvailability =
      validOffers.length > 0
        ? "orderable"
        : api.availability && api.availability !== "orderable"
          ? api.availability
          : "out_of_stock"
    return {
      detail: await mapApiDetail(
        { ...api, offers: validOffers, availability },
        locale,
        region
      ),
      source: "api",
    }
  } catch {
    return null
  }
}
