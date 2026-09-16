/**
 * Storefront-data: uitsluitend Product/Commerce Cloud met geldige offers.
 */

import {
  CatalogApiError,
  getCatalogBrand,
  getCatalogManufacturer,
  getCatalogProduct,
  getCatalogSeller,
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
import { resolveMediaUrl } from "@europmade/utils"
import {
  buildImageSrcSet,
  resolveOptimizedImageUrl,
} from "@europmade/utils"
import { getPageBackendOrigin } from "./page-backend-origin"
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
import { resolveOfferDeliveryLabel } from "./offer-delivery"

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
    imageUrl: resolveMediaUrl(item.image_url ?? null, backendOrigin),
  }
}

function hasValidCommerceOffer(item: CatalogListProduct): boolean {
  return item.offer_count > 0 && item.from_price != null && item.from_price > 0
}

async function toStorefrontProducts(
  items: CatalogListProduct[],
  locale: StorefrontLocale = DEFAULT_STOREFRONT_LOCALE
): Promise<ListingProduct[]> {
  const backendOrigin = await getPageBackendOrigin()
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
        return hasUsableOffer ? mapListItem(item, locale, backendOrigin) : null
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
  ids?: string[]
  sort?: "popularity" | "price_asc" | "price_desc" | "rating_desc" | "name_asc" | "name_desc"
  offset?: number
  limit?: number
  locale?: StorefrontLocale
}): Promise<{ products: ListingProduct[]; count: number; source: DataSource }> {
  const locale = opts?.locale ?? DEFAULT_STOREFRONT_LOCALE
  const backendOrigin = await getPageBackendOrigin()
  try {
    const res = await listCatalogProducts({
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
    })
    return {
      products: res.products
        .filter(hasValidCommerceOffer)
        .map((item) => mapListItem(item, locale, backendOrigin)),
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
  locale: StorefrontLocale
): Promise<PdpDetail> {
  const p = detail.product
  const backendOrigin = await getPageBackendOrigin()
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

  const mie = detail.made_in_europe ?? null
  const euOwnershipPercent =
    mie?.is_made_in_europe && mie.score != null ? mie.score : 0

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
    related = (await toStorefrontProducts(relatedList.products, locale))
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
    euOwnershipPercent,
    madeInEurope: mie
      ? {
          is_made_in_europe: mie.is_made_in_europe,
          score: mie.score,
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
    // Seller-owned FAQ only — no EuropMade platform FAQ seed on the PDP.
    faqs: [],
    sellerFaqs: [],
    pairsWellWith: related.slice(0, 4).map((r) => ({
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
