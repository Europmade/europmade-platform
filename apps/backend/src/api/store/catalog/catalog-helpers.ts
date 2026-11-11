import {
  formatAffiliateCommissionPercent,
  offerShipsToCountry,
  persistMediaReference,
  pickDisplayableMediaReference,
  type ProductAvailability,
} from "@europmade/utils"
import {
  evaluateOfferSellability,
  shippingProfileFacts,
  storefrontAvailability,
} from "../../../modules/commerce-cloud/offer-sellability"
import type { MedusaContainer } from "@medusajs/framework/types"
import { commissionForSellerProduct } from "../../../modules/affiliate/offer-commission"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { REVIEW_MODULE } from "../../../modules/review"
import type ReviewModuleService from "../../../modules/review/service"
import { buildProductCloudPreview } from "../product-cloud/product-preview"
import { loadBuyBoxForIdentifier } from "../commerce-cloud/buy-box-helpers"
import {
  categoryIdsMatchingCatalogFilter,
  productMatchesCategoryFilter,
} from "../../../modules/product-cloud/category-attributes"
import { presentVariantSize } from "../../../modules/product-cloud/shoe-sizes"
import { loadMadeInEuropeForProduct } from "../product-cloud/made-in-europe-helpers"
import {
  findClaimForProductRefs,
  toPublicEuropeanOwnership,
} from "../product-cloud/european-ownership-helpers"
import { VERIFICATION_MODULE } from "../../../modules/verification"
import type VerificationModuleService from "../../../modules/verification/service"
import { buildEffectivePriceView } from "../../../modules/commerce-cloud/offer-pricing"
import { normalizeCountryRates } from "../../../modules/commerce-cloud/shipping-profile-types"
import { toPublicProductLinkGroup } from "../../../modules/product-cloud/product-link-groups"

function versionTimestamp(version: { created_at?: string | Date | null }): string | null {
  const raw = version.created_at
  if (!raw) return null
  const date = raw instanceof Date ? raw : new Date(raw)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function comparePrice(
  left: number | null | undefined,
  right: number | null | undefined
): number {
  const leftOk = left != null && Number.isFinite(left) && left > 0
  const rightOk = right != null && Number.isFinite(right) && right > 0
  if (leftOk && rightOk && left !== right) return (left as number) - (right as number)
  if (leftOk !== rightOk) return leftOk ? -1 : 1
  return 0
}

function compareNewest(left?: string | null, right?: string | null): number {
  const leftTime = left ? Date.parse(left) : Number.NaN
  const rightTime = right ? Date.parse(right) : Number.NaN
  const leftOk = Number.isFinite(leftTime)
  const rightOk = Number.isFinite(rightTime)
  if (leftOk && rightOk && leftTime !== rightTime) return rightTime - leftTime
  if (leftOk !== rightOk) return leftOk ? -1 : 1
  return 0
}

type PublishedVersion = {
  id: string
  product_id: string
  version_number: number
  title: string
  description: string
  publication_status: string
}

export type CatalogListItem = {
  id: string
  title: string
  description: string | null
  lifecycle_status: string
  brand_name: string | null
  manufacturer_id: string | null
  manufacturer_name: string | null
  category_names: string[]
  category_slugs?: string[]
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
  country_code: string | null
  offer_count: number
  from_price: number | null
  /** Hoogste totale affiliatecommissie over de verkoopbare offers, in procentpunten. */
  affiliate_commission_percent: number | null
  /** "Tot 15%" bij meerdere offers, anders "11%". */
  affiliate_commission_label: string | null
  /** Verdienste op de offer met de hoogste commissie. */
  affiliate_earnings: number | null
  affiliate_offer_id: string | null
  /** Prijs van diezelfde offer (eenheidsprijs, zonder verzending). */
  affiliate_offer_price: number | null
  average_review_score: number | null
  review_count: number
  image_url: string | null
  brand_id?: string | null
  brand_slug?: string | null
  brand_logo_url?: string | null
  brand_page_published?: boolean
  published_at?: string | null
  attributes?: Array<{
    code: string | null
    name: string
    value: string
    unit: string | null
  }>
}

export type CatalogMediaItem = {
  id: string
  media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
  storage_reference: string | null
  sort_order: number
  metadata?: Record<string, unknown> | null
  embed_url?: string | null
  video_provider?: string | null
}

export type CatalogManufacturerProfile = {
  id: string
  name: string
  slug: string
  country_code: string | null
  product_count: number
  verified_product_count: number
}

/** Gedeelde slug-normalisatie (merk, producent, partner). */
export function slugifyCatalogEntityName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function sellerPublicSlug(sellerId: string, legalName: string): string {
  return slugifyCatalogEntityName(legalName) || sellerId.toLowerCase()
}

export type CatalogOfferView = {
  offer_id: string
  seller_id: string
  seller_name: string
  seller_slug: string
  base_price: number
  shipping_cost: number
  total_price: number
  regular_total_price: number | null
  promo_active: boolean
  quantity_available: number
  rank: number
  is_winner: boolean
  score: number
  affiliate_commission_percent: number | null
  affiliate_earnings: number | null
}

type IdentifierHit = {
  id: string
  product_variant_id: string
  identifier_type: string
  identifier_value: string
}

type VariantHit = {
  id: string
  product_id: string
}

async function listProductIdentifiers(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<IdentifierHit[]> {
  const variants = (await productCloud.listProductVariants({
    product_id: productId,
  })) as VariantHit[]
  const nested = await Promise.all(
    variants.map(
      (variant) =>
        productCloud.listIdentifiers({
          product_variant_id: variant.id,
        }) as Promise<IdentifierHit[]>
    )
  )
  return nested.flat()
}

async function findPublishedProductIdsByQuery(
  productCloud: ProductCloudModuleService,
  q: string
): Promise<Set<string>> {
  const ids = new Set<string>()
  const digits = q.replace(/\s+/g, "")
  if (!/^\d{8,14}$/.test(digits)) return ids
  const rows = (await productCloud.listIdentifiers(
    { identifier_value: digits },
    { take: 50 }
  )) as IdentifierHit[]
  for (const row of rows) {
    try {
      const variant = (await productCloud.retrieveProductVariant(
        row.product_variant_id
      )) as VariantHit
      ids.add(variant.product_id)
    } catch {
      continue
    }
  }
  return ids
}

/**
 * Gepubliceerde Product Cloud-producten (guest-read, Blueprint API-model §3).
 * Hergebruikt bestaande listProductVersions + buildProductCloudPreview.
 */
async function productIdsForCategoryNameFilter(
  productCloud: ProductCloudModuleService,
  categoryFilter: string
): Promise<Set<string>> {
  const categories = (await productCloud.listCategories({}, { take: 4000 })) as Array<{
    id: string
    name?: string | null
  }>
  const categoryIds = new Set(categoryIdsMatchingCatalogFilter(categories, categoryFilter))
  if (categoryIds.size === 0) return new Set()
  const links = (await productCloud.listProductCategories({}, { take: 20000 })) as Array<{
    product_id?: string
    category_id?: string
    product?: { id?: string } | string | null
    category?: { id?: string } | string | null
  }>
  const allowed = new Set<string>()
  for (const link of links) {
    const categoryId =
      (typeof link.category_id === "string" && link.category_id) ||
      (typeof link.category === "string" && link.category) ||
      (link.category && typeof link.category === "object" && link.category.id) ||
      ""
    const productId =
      (typeof link.product_id === "string" && link.product_id) ||
      (typeof link.product === "string" && link.product) ||
      (link.product && typeof link.product === "object" && link.product.id) ||
      ""
    if (categoryId && productId && categoryIds.has(categoryId)) allowed.add(productId)
  }
  return allowed
}

export async function listPublishedCatalogProducts(
  scope: MedusaContainer,
  opts: {
    category?: string
    q?: string
    region_code?: string
    take?: number
    offset?: number
    limit?: number
    manufacturer_id?: string
    brand_id?: string
    country_code?: string
    price_min?: number
    price_max?: number
    verified?: boolean
    ids?: string[]
    include_attributes?: boolean
    sort?:
      | "popularity"
      | "price_asc"
      | "price_desc"
      | "rating_desc"
      | "name_asc"
      | "name_desc"
      | "brand_asc"
      | "brand_desc"
      | "category_asc"
      | "category_desc"
      | "newest"
      | "oldest"
  } = {}
): Promise<{ products: CatalogListItem[]; count: number }> {
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const commerce = scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const reviews = scope.resolve(REVIEW_MODULE) as ReviewModuleService

  const region = (opts.region_code ?? "NL").toUpperCase()
  const idFilter = (opts.ids ?? [])
    .map((id) => id.trim())
    .filter(Boolean)
  const idSet = idFilter.length > 0 ? new Set(idFilter) : null
  const limit = Math.max(1, opts.limit ?? 24)
  const offset = Math.max(0, opts.offset ?? 0)
  const q = opts.q?.trim().toLowerCase() ?? ""
  const categoryFilter = opts.category?.trim().toLowerCase() ?? ""
  const scanTake =
    q || idSet || categoryFilter ? 8000 : Math.max(opts.take ?? 400, offset + limit)
  const sortKey = opts.sort ?? "popularity"

  const versions = (await productCloud.listProductVersions(
    { publication_status: "Gepubliceerd" },
    { order: { version_number: "DESC" }, take: scanTake }
  )) as PublishedVersion[]

  const seen = new Set<string>()
  const published: PublishedVersion[] = []
  for (const v of versions) {
    if (seen.has(v.product_id)) continue
    if (idSet && !idSet.has(v.product_id)) continue
    seen.add(v.product_id)
    published.push(v)
    if (published.length >= scanTake) break
  }

  const brandFilter = opts.brand_id?.trim().toLowerCase() ?? ""
  const manufacturerFilter = opts.manufacturer_id?.trim().toLowerCase() ?? ""

  const qProductIds = q ? await findPublishedProductIdsByQuery(productCloud, q) : new Set<string>()

  const brandNameById = new Map<string, string | null>()
  const brandIdentityById = new Map<
    string,
    { name: string | null; slug: string | null; logo_url: string | null; page_published: boolean }
  >()
  const manufacturerNameById = new Map<string, string | null>()
  const brandCountryById = new Map<string, string | null>()
  const versionIdByProduct = new Map<string, string>()
  const brandIdByProduct = new Map<string, string>()
  const identifierIdsByProduct = new Map<string, string[]>()
  const needsNamesDuringScan = Boolean(
    brandFilter ||
      manufacturerFilter ||
      q ||
      sortKey === "brand_asc" ||
      sortKey === "brand_desc" ||
      sortKey === "category_asc" ||
      sortKey === "category_desc"
  )
  const needsCountryDuringScan = Boolean(opts.country_code)

  async function cachedBrandIdentity(brandId: string): Promise<{
    name: string | null
    slug: string | null
    logo_url: string | null
    page_published: boolean
  }> {
    const cached = brandIdentityById.get(brandId)
    if (cached) return cached
    let identity: {
      name: string | null
      slug: string | null
      logo_url: string | null
      page_published: boolean
    }
    if (!brandId) {
      identity = { name: null, slug: null, logo_url: null, page_published: false }
    } else {
      try {
        const brand = await partner.retrieveBrand(brandId)
        const slug = typeof brand.slug === "string" ? brand.slug.trim() : ""
        const logo = typeof brand.logo_url === "string" ? brand.logo_url.trim() : ""
        identity = {
          name: brand.name?.trim() || null,
          slug: slug || null,
          logo_url: logo || null,
          page_published: brand.public_page_status === "published" && slug.length > 0,
        }
      } catch {
        identity = {
          name: await resolveBrandName(partner, brandId),
          slug: null,
          logo_url: null,
          page_published: false,
        }
      }
    }
    brandIdentityById.set(brandId, identity)
    return identity
  }
  async function cachedBrandName(brandId: string): Promise<string | null> {
    if (brandNameById.has(brandId)) return brandNameById.get(brandId) ?? null
    const identity = await cachedBrandIdentity(brandId)
    brandNameById.set(brandId, identity.name)
    return identity.name
  }
  async function cachedManufacturerName(
    manufacturerId: string
  ): Promise<string | null> {
    if (manufacturerNameById.has(manufacturerId)) {
      return manufacturerNameById.get(manufacturerId) ?? null
    }
    const name = await resolveManufacturerName(partner, manufacturerId)
    manufacturerNameById.set(manufacturerId, name)
    return name
  }
  async function cachedBrandCountry(brandId: string): Promise<string | null> {
    if (brandCountryById.has(brandId)) return brandCountryById.get(brandId) ?? null
    const country = await resolveBrandCountry(partner, brandId)
    brandCountryById.set(brandId, country)
    return country
  }

  type ProductScanRow = {
    id: string
    brand_id?: string
    manufacturer_id?: string
    lifecycle_status?: string
  }

  let scanList = published
  if (q) {
    const ids = published.map((row) => row.product_id)
    let productRows: ProductScanRow[] = []
    try {
      productRows = (await productCloud.listProducts(
        { id: ids },
        { take: Math.max(ids.length, 1) }
      )) as ProductScanRow[]
    } catch {
      productRows = (await productCloud.listProducts(
        {},
        { take: scanTake }
      )) as ProductScanRow[]
    }
    const productById = new Map(productRows.map((row) => [row.id, row]))
    const uniqueBrandIds = [
      ...new Set(
        productRows
          .map((row) => row.brand_id)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    const uniqueMfrIds = [
      ...new Set(
        productRows
          .map((row) => row.manufacturer_id)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    await Promise.all([
      ...uniqueBrandIds.map((id) => cachedBrandName(id)),
      ...uniqueMfrIds.map((id) => cachedManufacturerName(id)),
    ])
    const compactQ = q.replace(/\s/g, "")
    scanList =
      productRows.length === 0
        ? published
        : published.filter((version) => {
            const product = productById.get(version.product_id)
            if (product?.lifecycle_status === "Gearchiveerd") return false
            if (qProductIds.has(version.product_id)) return true
            const brandName = product?.brand_id
              ? (brandNameById.get(product.brand_id) ?? "")
              : ""
            const mfrName = product?.manufacturer_id
              ? (manufacturerNameById.get(product.manufacturer_id) ?? "")
              : ""
            const hay = [
              version.title ?? "",
              version.description ?? "",
              version.product_id,
              brandName,
              mfrName,
              product?.brand_id ?? "",
              product?.manufacturer_id ?? "",
            ]
              .join(" ")
              .toLowerCase()
            return hay.includes(q) || version.product_id.toLowerCase().includes(compactQ)
          })
  }

  if (categoryFilter) {
    const allowed = await productIdsForCategoryNameFilter(productCloud, categoryFilter)
    scanList = scanList.filter((row) => allowed.has(row.product_id))
  }

  const items: CatalogListItem[] = []
  const profileCache = new Map<
    string,
    { status: string; countryActive: boolean } | null
  >()
  for (const version of scanList) {
    const identifierBundle = await listProductIdentifiers(
      productCloud,
      version.product_id
    )
    const preferred = identifierBundle[0]
    const preview = await buildProductCloudPreview(
      productCloud,
      version.product_id,
      preferred
        ? {
            identifier_id: preferred.id,
            identifier_type: preferred.identifier_type,
            identifier_value: preferred.identifier_value,
          }
        : undefined
    )
    // Alleen actieve producten in de publieke catalogus (lifecycle ≠ gearchiveerd).
    if (preview.lifecycle_status === "Gearchiveerd") continue

    const brand = needsNamesDuringScan
      ? await cachedBrandName(preview.brand_id)
      : null
    const manufacturer_name = needsNamesDuringScan
      ? await cachedManufacturerName(preview.manufacturer_id)
      : null
    const country_code = needsCountryDuringScan
      ? await cachedBrandCountry(preview.brand_id)
      : null
    const brandHay = [preview.brand_id, brand, slugifyCatalogEntityName(brand ?? "")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    const manufacturerHay = [
      preview.manufacturer_id,
      manufacturer_name,
      slugifyCatalogEntityName(manufacturer_name ?? ""),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    if (brandFilter && !brandHay.includes(brandFilter)) continue
    if (manufacturerFilter && !manufacturerHay.includes(manufacturerFilter)) {
      continue
    }

    if (
      categoryFilter &&
      !productMatchesCategoryFilter(preview.category_names, categoryFilter)
    ) {
      continue
    }

    const identifierValues = identifierBundle.map((i) => i.identifier_value)
    const identifierIds = identifierBundle.map((i) => i.id)
    if (!preview.identifier_value && identifierValues[0]) {
      preview.identifier_id = identifierBundle[0]?.id ?? preview.identifier_id
      preview.identifier_type =
        identifierBundle[0]?.identifier_type ?? preview.identifier_type
      preview.identifier_value = identifierValues[0]
    }

    if (q) {
      const hay = [
        preview.title ?? "",
        version.title ?? "",
        version.description ?? "",
        brand ?? "",
        manufacturer_name ?? "",
        ...preview.category_names,
        ...identifierValues,
        version.product_id,
      ]
        .join(" ")
        .toLowerCase()
      const hit =
        qProductIds.has(version.product_id) ||
        hay.includes(q) ||
        identifierValues.some((v) =>
          v.toLowerCase().includes(q.replace(/\s/g, ""))
        )
      if (!hit) continue
    }

    if (opts.country_code) {
      const wantedCountry = opts.country_code.trim().toUpperCase()
      if ((country_code ?? "").toUpperCase() !== wantedCountry) continue
    }

    if (opts.verified && preview.lifecycle_status !== "Verified™") {
      continue
    }

    const idsForOffers =
      identifierIds.length > 0
        ? identifierIds
        : preview.identifier_id
          ? [preview.identifier_id]
          : []
    let offer_count = 0
    let from_price: number | null = null
    for (const identifierId of idsForOffers) {
      const pricing = await minOfferPricing(
        commerce,
        identifierId,
        region,
        profileCache
      )
      offer_count += pricing.offer_count
      if (
        pricing.from_price != null &&
        (from_price == null || pricing.from_price < from_price)
      ) {
        from_price = pricing.from_price
      }
    }

    if (opts.price_min != null && (from_price == null || from_price < opts.price_min)) {
      continue
    }
    if (opts.price_max != null && (from_price == null || from_price > opts.price_max)) {
      continue
    }
    if (offer_count === 0) continue

    versionIdByProduct.set(version.product_id, version.id)
    brandIdByProduct.set(version.product_id, preview.brand_id)
    identifierIdsByProduct.set(version.product_id, idsForOffers)

    items.push({
      id: version.product_id,
      title: preview.title ?? version.title,
      description: version.description || null,
      lifecycle_status: preview.lifecycle_status,
      brand_name: brand,
      manufacturer_id: preview.manufacturer_id || null,
      manufacturer_name,
      category_names: preview.category_names,
      category_slugs: preview.category_slugs,
      identifier_id: preview.identifier_id,
      identifier_type: preview.identifier_type,
      identifier_value: preview.identifier_value,
      country_code,
      offer_count,
      from_price,
      affiliate_commission_percent: null,
      affiliate_commission_label: null,
      affiliate_earnings: null,
      affiliate_offer_id: null,
      affiliate_offer_price: null,
      average_review_score: null,
      review_count: 0,
      image_url: null,
      published_at: versionTimestamp(version),
      attributes: [],
    })
  }

  const sort = sortKey
  if (idSet) {
    const order = new Map(idFilter.map((id, i) => [id, i]))
    items.sort(
      (a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999)
    )
  } else {
    if (sort === "rating_desc") {
      await Promise.all(
        items.map(async (item) => {
          const productReviews = await reviews.listReviews(
            { product_id: item.id, review_type: "Productreview" },
            { take: 200 }
          )
          item.review_count = productReviews.length
          item.average_review_score =
            item.review_count > 0
              ? productReviews.reduce((s, r) => s + Number(r.score), 0) /
                item.review_count
              : null
        })
      )
    }
    items.sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return comparePrice(a.from_price, b.from_price)
        case "price_desc":
          return comparePrice(b.from_price, a.from_price)
        case "rating_desc":
          return (b.average_review_score ?? 0) - (a.average_review_score ?? 0)
        case "name_asc":
          return (a.title ?? "").localeCompare(b.title ?? "", "nl")
        case "name_desc":
          return (b.title ?? "").localeCompare(a.title ?? "", "nl")
        case "brand_asc":
          return (a.brand_name ?? "").localeCompare(b.brand_name ?? "", "nl") ||
            (a.title ?? "").localeCompare(b.title ?? "", "nl")
        case "brand_desc":
          return (b.brand_name ?? "").localeCompare(a.brand_name ?? "", "nl") ||
            (b.title ?? "").localeCompare(a.title ?? "", "nl")
        case "category_asc": {
          const ac = (a.category_names ?? []).join(", ")
          const bc = (b.category_names ?? []).join(", ")
          return ac.localeCompare(bc, "nl") || (a.title ?? "").localeCompare(b.title ?? "", "nl")
        }
        case "category_desc": {
          const ac = (a.category_names ?? []).join(", ")
          const bc = (b.category_names ?? []).join(", ")
          return bc.localeCompare(ac, "nl") || (b.title ?? "").localeCompare(a.title ?? "", "nl")
        }
        case "newest":
          return compareNewest(a.published_at, b.published_at)
        case "oldest":
          return (a.id ?? "").localeCompare(b.id ?? "")
        case "popularity":
        default:
          return b.offer_count - a.offer_count || (b.average_review_score ?? 0) - (a.average_review_score ?? 0)
      }
    })
  }

  const count = items.length
  const paged = items.slice(offset, offset + limit)
  await Promise.all(
    paged.map(async (item) => {
      const brandId = brandIdByProduct.get(item.id) ?? ""
      const [productReviews, image_url, brand_name, manufacturer_name, country_code] =
        await Promise.all([
          item.review_count > 0 ||
          item.average_review_score != null ||
          sort === "rating_desc"
            ? Promise.resolve(null)
            : reviews.listReviews(
                { product_id: item.id, review_type: "Productreview" },
                { take: 200 }
              ),
          resolvePrimaryImageUrl(
            productCloud,
            versionIdByProduct.get(item.id) ?? ""
          ),
          needsNamesDuringScan
            ? Promise.resolve(item.brand_name)
            : cachedBrandName(brandId),
          needsNamesDuringScan
            ? Promise.resolve(item.manufacturer_name)
            : cachedManufacturerName(item.manufacturer_id ?? ""),
          needsCountryDuringScan
            ? Promise.resolve(item.country_code)
            : cachedBrandCountry(brandId),
        ])
      if (productReviews) {
        item.review_count = productReviews.length
        item.average_review_score =
          item.review_count > 0
            ? productReviews.reduce((s, r) => s + Number(r.score), 0) /
              item.review_count
            : null
      }
      item.image_url = image_url
      if (opts.include_attributes) {
        item.attributes = await loadPublicProductAttributes(
          productCloud,
          versionIdByProduct.get(item.id) ?? "",
          item.id,
          { includeUnlistedCodes: true }
        )
      }
      const identity = await cachedBrandIdentity(brandId)
      item.brand_name = brand_name || identity.name
      item.brand_id = brandId || null
      item.brand_slug = identity.slug
      item.brand_logo_url = identity.logo_url
      item.brand_page_published = identity.page_published
      item.manufacturer_name = manufacturer_name
      item.country_code = country_code
      await attachHighestAffiliateCommission(
        commerce,
        partner,
        item,
        identifierIdsByProduct.get(item.id) ?? [],
        region
      )
    })
  )

  return { products: paged, count }
}

/**
 * Publieke producentpagina: Manufacturer (Partner-module) + gepubliceerde producten.
 */
export async function loadManufacturerCatalogPage(
  scope: MedusaContainer,
  slug: string,
  region_code = "NL"
): Promise<{
  manufacturer: CatalogManufacturerProfile
  products: CatalogListItem[]
} | null> {
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) return null

  const manufacturers = (await partner.listManufacturers(
    {},
    { take: 500 }
  )) as Array<{ id: string; name?: string }>

  let match: { id: string; name: string } | null = null
  for (const row of manufacturers) {
    const name = row.name?.trim()
    if (!name) continue
    if (slugifyCatalogEntityName(name) === normalizedSlug) {
      match = { id: row.id, name }
      break
    }
  }

  if (!match) {
    const productCloud = scope.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const versions = (await productCloud.listProductVersions(
      { publication_status: "Gepubliceerd" },
      { order: { version_number: "DESC" }, take: 500 }
    )) as PublishedVersion[]
    const seenProduct = new Set<string>()
    const seenManufacturer = new Set<string>()
    for (const version of versions) {
      if (seenProduct.has(version.product_id)) continue
      seenProduct.add(version.product_id)
      let product: { manufacturer_id?: string; lifecycle_status?: string }
      try {
        product = await productCloud.retrieveProduct(version.product_id)
      } catch {
        continue
      }
      if (product.lifecycle_status === "Gearchiveerd") continue
      const manufacturerId = product.manufacturer_id?.trim()
      if (!manufacturerId || seenManufacturer.has(manufacturerId)) continue
      seenManufacturer.add(manufacturerId)
      const name = await resolveManufacturerName(partner, manufacturerId)
      if (!name) continue
      if (slugifyCatalogEntityName(name) === normalizedSlug) {
        match = { id: manufacturerId, name }
        break
      }
    }
  }
  if (!match) return null

  const { products } = await listPublishedCatalogProducts(scope, {
    manufacturer_id: match.id,
    region_code,
    take: 200,
  })
  if (products.length === 0) return null

  const country_code = await resolveManufacturerCountry(partner, match.id)
  const verified_product_count = products.filter(
    (p) => p.lifecycle_status === "Verified™"
  ).length

  return {
    manufacturer: {
      id: match.id,
      name: match.name,
      slug: slugifyCatalogEntityName(match.name),
      country_code,
      product_count: products.length,
      verified_product_count,
    },
    products,
  }
}

async function publicEuropeanOwnershipForProduct(
  scope: MedusaContainer,
  product: { brand_id?: string | null; manufacturer_id?: string | null }
) {
  const brandId = String(product.brand_id || "").trim()
  const manufacturerId = String(product.manufacturer_id || "").trim()
  if (!brandId && !manufacturerId) return null
  try {
    const verification = scope.resolve(
      VERIFICATION_MODULE
    ) as VerificationModuleService
    const claim = await findClaimForProductRefs(verification, {
      brand_id: brandId || null,
      manufacturer_id: manufacturerId || null,
    })
    return toPublicEuropeanOwnership(claim)
  } catch {
    return null
  }
}

async function madeInEuropeEvidenceApproved(
  scope: MedusaContainer,
  productId: string,
  qualifies: boolean
): Promise<boolean> {
  if (!qualifies) return false
  try {
    const verification = scope.resolve(
      VERIFICATION_MODULE
    ) as VerificationModuleService
    const rows = (await verification.listProductOriginEvidences({
      product_id: productId,
    })) as Array<{ verification_status?: string; evidence_kind?: string | null }>
    return rows.some(
      (row) =>
        row.verification_status === "approved" &&
        (!row.evidence_kind || row.evidence_kind === "made_in_europe")
    )
  } catch {
    return false
  }
}

function productionCountryLabel(origin: {
  production_country?: string | null
  primary_assembly_country?: string | null
} | null): string | null {
  const raw = (origin?.production_country || "").trim()
  if (raw && raw.toUpperCase() !== "EU") return raw
  const code = (origin?.primary_assembly_country || "").trim()
  return code || null
}

async function storefrontMadeInEurope(
  scope: MedusaContainer,
  productId: string
) {
  const mie = await loadMadeInEuropeForProduct(scope, productId)
  if (!mie) return null
  const score = mie.score
  const evidence_approved = await madeInEuropeEvidenceApproved(
    scope,
    productId,
    Boolean(score?.is_made_in_europe && score.score != null)
  )
  const qualifies =
    Boolean(score?.is_made_in_europe) && typeof score?.score === "number"
  return {
    is_made_in_europe: qualifies,
    score: qualifies ? score!.score : null,
    incomplete: !score,
    evidence_approved: qualifies ? evidence_approved : false,
    assembly_points: score?.assembly_points ?? 0,
    parts_points: score?.parts_points ?? 0,
    materials_points: score?.materials_points ?? 0,
    max_assembly: score?.max_assembly ?? 75,
    max_parts: score?.max_parts ?? 15,
    max_materials: score?.max_materials ?? 10,
    assembly_eu_band: score?.assembly_eu_band ?? mie.origin?.assembly_eu_band ?? "",
    parts_eu_level: score?.parts_eu_level ?? mie.origin?.parts_eu_level ?? "",
    materials_eu_level:
      score?.materials_eu_level ?? mie.origin?.materials_eu_level ?? "",
    primary_assembly_country:
      score?.primary_assembly_country ?? mie.origin?.primary_assembly_country ?? null,
    production_country_label: productionCountryLabel(mie.origin),
    facility: mie.facility
      ? {
          id: mie.facility.id,
          name: mie.facility.name,
          country_code: mie.facility.country_code,
          region: mie.facility.region ?? null,
        }
      : null,
  }
}

/**
 * Publieke PDP-payload: Product Cloud + Buy Box + Offer-commercieel + reviews.
 */
export async function loadCatalogProductDetail(
  scope: MedusaContainer,
  productId: string,
  region_code = "NL"
) {
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const commerce = scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const reviews = scope.resolve(REVIEW_MODULE) as ReviewModuleService

  let product: Awaited<ReturnType<ProductCloudModuleService["retrieveProduct"]>>
  try {
    product = await productCloud.retrieveProduct(productId)
  } catch {
    return null
  }

  const versions = (await productCloud.listProductVersions(
    { product_id: productId, publication_status: "Gepubliceerd" },
    { order: { version_number: "DESC" }, take: 1 }
  )) as PublishedVersion[]
  const version = versions[0]
  if (!version) {
    const latest = (await productCloud.listProductVersions(
      { product_id: productId },
      { order: { version_number: "DESC" }, take: 1 }
    )) as PublishedVersion[]
    return {
      availability: "not_published" as const,
      product: {
        id: product.id,
        title: latest[0]?.title?.trim() || "Product",
        description: "",
        lifecycle_status: product.lifecycle_status,
        brand_name: null,
        manufacturer_name: null,
        category_names: [],
        identifier_id: null,
        identifier_type: null,
        identifier_value: null,
        country_code: null,
        image_url: null,
        media: [],
      },
      made_in_europe: await storefrontMadeInEurope(scope, productId),
      european_ownership: await publicEuropeanOwnershipForProduct(scope, product),
      buy_box: null,
      offers: [],
      reviews: [],
      seller_reviews: [],
      seller_review_aggregate: { average_score: null, count: 0 },
      product_link_group: null,
    }
  }

  const preview = await buildProductCloudPreview(productCloud, productId)
  const brand_name = await resolveBrandName(partner, preview.brand_id)
  const manufacturer_name = await resolveManufacturerName(
    partner,
    preview.manufacturer_id
  )
  const country_code = await resolveBrandCountry(partner, preview.brand_id)

  const region = region_code.toUpperCase()
  let buy_box: Awaited<ReturnType<typeof loadBuyBoxForIdentifier>> | null = null
  let offers: CatalogOfferView[] = []

  if (preview.identifier_id) {
    buy_box = await loadBuyBoxForIdentifier(
      scope,
      preview.identifier_id,
      region
    )
    offers = await enrichRankedOffers(
      commerce,
      partner,
      buy_box,
      productId
    )
  }

  const productReviews = await reviews.listReviews(
    { product_id: productId, review_type: "Productreview" },
    { order: { created_at: "DESC" }, take: 50 }
  )

  const winnerSellerId = offers.find((o) => o.is_winner)?.seller_id
  let seller_reviews: Array<{
    id: string
    score: number
    text: string | null
    created_at: Date | string
  }> = []
  let seller_review_aggregate: { average_score: number | null; count: number } =
    { average_score: null, count: 0 }

  if (winnerSellerId) {
    const rows = await reviews.listReviews(
      { seller_id: winnerSellerId, review_type: "Verkopersreview" },
      { order: { created_at: "DESC" }, take: 50 }
    )
    seller_reviews = rows.map((r) => ({
      id: r.id,
      score: Number(r.score),
      text: r.text,
      created_at: r.created_at,
    }))
    const agg = await reviews.averageSellerScoreRaw(winnerSellerId)
    seller_review_aggregate = {
      average_score: agg.average,
      count: agg.count,
    }
  }

  const made_in_europe = await storefrontMadeInEurope(scope, productId)
  const european_ownership = await publicEuropeanOwnershipForProduct(scope, product)

  const rawLinkGroup =
    await productCloud.getActiveProductLinkGroupForProduct(productId)
  let product_link_group = null as ReturnType<typeof toPublicProductLinkGroup>
  if (rawLinkGroup && Array.isArray(rawLinkGroup.members)) {
    const publicMembers = []
    for (const member of rawLinkGroup.members) {
      let image_url: string | null = null
      let storefrontOk = false
      try {
        const published = (await productCloud.listProductVersions(
          { product_id: member.product_id, publication_status: "Gepubliceerd" },
          { order: { version_number: "DESC" }, take: 1 }
        )) as PublishedVersion[]
        if (published[0]) {
          image_url = await resolvePrimaryImageUrl(productCloud, published[0].id)
          const memberPreview = await buildProductCloudPreview(
            productCloud,
            member.product_id
          )
          let hasSellableOffer = false
          if (memberPreview.identifier_id) {
            const memberBuyBox = await loadBuyBoxForIdentifier(
              scope,
              memberPreview.identifier_id,
              region
            )
            if (memberBuyBox?.ranked?.length) {
              const memberOffers = await enrichRankedOffers(
                commerce,
                partner,
                memberBuyBox
              )
              hasSellableOffer = memberOffers.some(
                (o) => Number(o.quantity_available) > 0
              )
            }
          }
          storefrontOk = hasSellableOffer
        }
      } catch {
        image_url = null
        storefrontOk = false
      }
      if (!storefrontOk) continue
      publicMembers.push({ ...member, image_url })
    }
    product_link_group = toPublicProductLinkGroup({
      ...rawLinkGroup,
      members: publicMembers,
    })
  }

  let availability: ProductAvailability = "not_deliverable"
  if (preview.identifier_id) {
    const regionOffers = await commerce.listOffers({
      identifier_id: preview.identifier_id,
      region_code: region,
    })
    const judged = []
    for (const offer of regionOffers) {
      judged.push(await judgeCatalogOffer(commerce, offer, "Gepubliceerd", region))
    }
    availability = storefrontAvailability({
      published: true,
      offers: judged,
    })
  }

  const productAttributes = await loadPublicProductAttributes(
    productCloud,
    version.id,
    productId
  )
  const publicVariants = (
    (await productCloud.listProductVariants({ product_id: productId })) as Array<{
      id: string
      variant_type: string
      variant_value: string
    }>
  ).map((row) => ({
    id: row.id,
    variant_type: row.variant_type,
    variant_value: row.variant_value,
    size_label: presentVariantSize({
      variantType: row.variant_type,
      variantValue: row.variant_value,
      categoryNames: preview.category_names,
    }),
  }))

  return {
    availability,
    product: {
      id: product.id,
      title: preview.title ?? version.title,
      description: version.description,
      lifecycle_status: product.lifecycle_status,
      brand_name,
      manufacturer_name,
      category_names: preview.category_names,
      category_slugs: preview.category_slugs,
      identifier_id: preview.identifier_id,
      identifier_type: preview.identifier_type,
      identifier_value: preview.identifier_value,
      country_code: made_in_europe?.primary_assembly_country ?? country_code,
      image_url: await resolvePrimaryImageUrl(productCloud, version.id),
      media: await resolveProductMediaItems(productCloud, version.id),
      attributes: productAttributes,
      variants: publicVariants,
    },
    made_in_europe,
    european_ownership,
    buy_box: buy_box
      ? {
          source: "recompute" as const,
          identifier_id: buy_box.identifier_id,
          region_code: buy_box.region_code,
          winning_offer_id: buy_box.winning_offer_id,
          ranked: buy_box.ranked,
          weights: buy_box.weights,
          computed_at: buy_box.computed_at,
        }
      : null,
    offers,
    reviews: productReviews.map((r) => ({
      id: r.id,
      score: Number(r.score),
      text: r.text,
      created_at: r.created_at,
      review_type: r.review_type,
    })),
    seller_reviews,
    seller_review_aggregate,
    product_link_group,
  }
}

async function loadPublicProductAttributes(
  productCloud: ProductCloudModuleService,
  versionId: string,
  productId: string,
  options?: { includeUnlistedCodes?: boolean }
): Promise<
  Array<{
    code: string | null
    name: string
    value: string
    unit: string | null
    sort_order: number
  }>
> {
  try {
    const { isManagedProductSpecCode, formatSpecDisplayValue } = await import(
      "../../../modules/product-cloud/product-specifications"
    )
    const vals = (await productCloud.listAttributeValues({
      product_version_id: versionId,
    })) as Array<{ attribute_definition_id: string; value?: string | null }>
    if (!vals.length) return []
    const defIds = [...new Set(vals.map((v) => v.attribute_definition_id))]
    const defs = (await productCloud.listAttributeDefinitions({
      id: defIds,
    })) as Array<{
      id: string
      code?: string | null
      name?: string
      unit?: string | null
      sort_order?: number | null
    }>
    const defById = new Map(defs.map((d) => [d.id, d]))
    const out: Array<{
      code: string | null
      name: string
      value: string
      unit: string | null
      sort_order: number
    }> = []
    for (const row of vals) {
      const value = String(row.value || "").trim()
      if (!value) continue
      const def = defById.get(row.attribute_definition_id)
      const code = def?.code ?? null
      if (!options?.includeUnlistedCodes && !isManagedProductSpecCode(code)) continue
      if (options?.includeUnlistedCodes && !code?.trim()) continue
      out.push({
        code,
        name: def?.name || code || row.attribute_definition_id,
        value: formatSpecDisplayValue({ unit: def?.unit ?? undefined }, value),
        unit: def?.unit ?? null,
        sort_order: Number(def?.sort_order ?? 0),
      })
    }
    out.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "nl"))
    void productId
    return out
  } catch {
    return []
  }
}

async function resolvePrimaryImageUrl(
  productCloud: ProductCloudModuleService,
  versionId: string
): Promise<string | null> {
  const items = await resolveProductMediaItems(productCloud, versionId)
  return pickDisplayableMediaReference(items)
}

export async function resolveProductMediaItems(
  productCloud: ProductCloudModuleService,
  versionId: string
): Promise<CatalogMediaItem[]> {
  try {
    const media = (await productCloud.listProductMedias(
      { product_version_id: versionId },
      { order: { sort_order: "ASC" }, take: 40 }
    )) as Array<{
      id: string
      media_type?: string
      storage_reference?: string
      sort_order?: number
      metadata?: Record<string, unknown> | null
    }>

    return media.map((m) => {
      const ref = persistMediaReference(m.storage_reference?.trim())
      const videoMeta = m.metadata?.video as
        | { embed_url?: string; provider?: string }
        | undefined
      const isVideo = m.media_type === "Video"
      return {
        id: m.id,
        media_type: (m.media_type || "Overige afbeelding") as CatalogMediaItem["media_type"],
        storage_reference: ref,
        sort_order: Number(m.sort_order ?? 0),
        metadata: m.metadata ?? null,
        embed_url: isVideo ? videoMeta?.embed_url ?? ref : null,
        video_provider: isVideo ? videoMeta?.provider ?? null : null,
      }
    })
  } catch {
    return []
  }
}

async function resolveBrandName(
  partner: PartnerModuleService,
  brandId: string
): Promise<string | null> {
  if (!brandId) return null
  try {
    const brand = await partner.retrieveBrand(brandId)
    return brand.name ?? null
  } catch {
    if (brandId.startsWith("brand_")) return null
    return brandId
  }
}

export async function resolveManufacturerName(
  partner: PartnerModuleService,
  manufacturerId: string
): Promise<string | null> {
  if (!manufacturerId) return null
  try {
    const m = await partner.retrieveManufacturer(manufacturerId)
    return (m as { name?: string }).name ?? null
  } catch {
    // Legacy/test Product Cloud-rijen gebruiken soms vrije tekst i.p.v. manu_*-FK.
    if (
      manufacturerId.startsWith("manu_") ||
      manufacturerId.startsWith("mfr_")
    ) {
      return null
    }
    return manufacturerId
  }
}

async function resolveBrandCountry(
  partner: PartnerModuleService,
  brandId: string
): Promise<string | null> {
  if (!brandId) return null
  try {
    const brand = await partner.retrieveBrand(brandId, {
      relations: ["owner_company"],
    })
    const company = (
      brand as { owner_company?: { country_code?: string } | null }
    ).owner_company
    return company?.country_code ?? null
  } catch {
    return null
  }
}

async function resolveManufacturerCountry(
  partner: PartnerModuleService,
  manufacturerId: string
): Promise<string | null> {
  if (!manufacturerId) return null
  try {
    const manufacturer = await partner.retrieveManufacturer(manufacturerId, {
      relations: ["represented_by_company"],
    })
    const company = (
      manufacturer as {
        represented_by_company?: { country_code?: string } | null
      }
    ).represented_by_company
    return company?.country_code ?? null
  } catch {
    return null
  }
}

async function judgeCatalogOffer(
  commerce: CommerceCloudModuleService,
  offer: {
    id: string
    seller_id: string
    region_code?: string | null
    sales_status?: string | null
    delivery_days_max?: number | null
    shipping_profile_id?: string | null
  },
  publicationStatus: string,
  destination: string
): Promise<{
  ships: boolean
  decision: ReturnType<typeof evaluateOfferSellability>
  total_price: number | null
  unit_price: number | null
  offer_id: string
  seller_id: string
}> {
  const [[inventory], [price]] = await Promise.all([
    commerce.listOfferInventories({ offer_id: offer.id }),
    commerce.listOfferPrices({ offer_id: offer.id }),
  ])
  const profile = offer.shipping_profile_id
    ? await loadShippingProfile(commerce, offer.shipping_profile_id)
    : null
  const facts = shippingProfileFacts({
    shipping_profile_id: offer.shipping_profile_id,
    region_code: offer.region_code,
    profile,
  })
  const view =
    price != null
      ? buildEffectivePriceView({
          base_price: Number(price.base_price),
          shipping_cost: Number(price.shipping_cost),
          extra_delivery_cost:
            price.extra_delivery_cost != null ? Number(price.extra_delivery_cost) : null,
          promo_price: price.promo_price != null ? Number(price.promo_price) : null,
          promo_starts_at: price.promo_starts_at ?? null,
          promo_ends_at: price.promo_ends_at ?? null,
        })
      : null
  const destinationCode = destination.trim().toUpperCase()
  const rates = profile
    ? normalizeCountryRates(profile.country_rates as Record<string, unknown> | null)
    : null
  const destinationRate = rates?.[destinationCode]
  return {
    ships: offerShipsToCountry({
      regionCode: offer.region_code,
      destinationCountry: destinationCode,
      shippingProfileId: offer.shipping_profile_id,
      profileStatus: facts.shipping_profile_status,
      countryActive: offer.shipping_profile_id
        ? Boolean(destinationRate && destinationRate.active !== false)
        : null,
    }),
    decision: evaluateOfferSellability({
      has_offer: true,
      sales_status: offer.sales_status,
      base_price: view?.unit_price ?? null,
      has_inventory: inventory != null,
      quantity_available: inventory != null ? Number(inventory.quantity_available) : null,
      delivery_days_max:
        offer.delivery_days_max != null ? Number(offer.delivery_days_max) : null,
      shipping_profile_id: offer.shipping_profile_id,
      shipping_profile_status: facts.shipping_profile_status,
      shipping_profile_serves_region: facts.shipping_profile_serves_region,
      publication_status: publicationStatus,
    }),
    total_price: view?.total_customer_price ?? null,
    unit_price: view?.unit_price ?? null,
    offer_id: offer.id,
    seller_id: offer.seller_id,
  }
}

async function loadShippingProfile(
  commerce: CommerceCloudModuleService,
  profileId: string
) {
  const [profile] = await commerce.listSellerShippingProfiles({ id: profileId })
  return profile ?? null
}

async function minOfferPricing(
  commerce: CommerceCloudModuleService,
  identifierId: string,
  regionCode: string,
  profileCache: Map<string, { status: string; countryActive: boolean } | null> = new Map()
): Promise<{ offer_count: number; from_price: number | null }> {
  void profileCache
  const offers = await commerce.listOffers({
    identifier_id: identifierId,
    region_code: regionCode,
  })
  const priced = await Promise.all(
    offers.map(async (offer) => {
      const judged = await judgeCatalogOffer(
        commerce,
        offer,
        "Gepubliceerd",
        regionCode
      )
      return judged.decision.sellable ? judged.total_price : null
    })
  )
  let from_price: number | null = null
  let offer_count = 0
  for (const total of priced) {
    if (total == null) continue
    offer_count += 1
    if (from_price == null || total < from_price) from_price = total
  }
  return { offer_count, from_price }
}

type SellableOfferRow = {
  offer_id: string
  seller_id: string
  unit_price: number
}

async function listSellableOfferRows(
  commerce: CommerceCloudModuleService,
  identifierId: string,
  regionCode: string
): Promise<SellableOfferRow[]> {
  const offers = await commerce.listOffers({
    identifier_id: identifierId,
    region_code: regionCode,
  })
  const rows = await Promise.all(
    offers.map(async (offer) => {
      const judged = await judgeCatalogOffer(
        commerce,
        offer,
        "Gepubliceerd",
        regionCode
      )
      if (!judged.decision.sellable || judged.unit_price == null) return null
      return {
        offer_id: judged.offer_id,
        seller_id: judged.seller_id,
        unit_price: judged.unit_price,
      }
    })
  )
  return rows.filter((row): row is SellableOfferRow => row != null)
}

async function cachedSellerCommissionSettings(
  partner: PartnerModuleService,
  sellerId: string,
  cache: Map<string, unknown>
): Promise<unknown> {
  if (cache.has(sellerId)) return cache.get(sellerId)
  try {
    const seller = await partner.retrieveSeller(sellerId)
    const raw = (
      seller as { affiliate_commission_settings?: unknown }
    ).affiliate_commission_settings
    cache.set(sellerId, raw ?? null)
    return raw ?? null
  } catch {
    cache.set(sellerId, null)
    return null
  }
}

async function attachHighestAffiliateCommission(
  commerce: CommerceCloudModuleService,
  partner: PartnerModuleService,
  item: CatalogListItem,
  identifierIds: string[],
  regionCode: string
): Promise<void> {
  const rows: SellableOfferRow[] = []
  for (const identifierId of identifierIds) {
    rows.push(...(await listSellableOfferRows(commerce, identifierId, regionCode)))
  }
  if (rows.length === 0) return
  const settingsCache = new Map<string, unknown>()
  const rated = await Promise.all(
    rows.map(async (row) => {
      const settings = await cachedSellerCommissionSettings(
        partner,
        row.seller_id,
        settingsCache
      )
      const commission = commissionForSellerProduct(settings, item.id)
      return { ...row, totalPercent: commission.totalPercent }
    })
  )
  rated.sort(
    (a, b) => b.totalPercent - a.totalPercent || b.unit_price - a.unit_price
  )
  const best = rated[0]
  if (!best) return
  item.affiliate_commission_percent = best.totalPercent
  item.affiliate_commission_label =
    rated.length > 1
      ? `Tot ${formatAffiliateCommissionPercent(best.totalPercent)}`
      : formatAffiliateCommissionPercent(best.totalPercent)
  item.affiliate_earnings = Math.round(best.unit_price * best.totalPercent) / 100
  item.affiliate_offer_id = best.offer_id
  item.affiliate_offer_price = best.unit_price
}

async function enrichRankedOffers(
  commerce: CommerceCloudModuleService,
  partner: PartnerModuleService,
  buy_box: Awaited<ReturnType<typeof loadBuyBoxForIdentifier>>,
  productId?: string
): Promise<CatalogOfferView[]> {
  const views: CatalogOfferView[] = []
  const settingsCache = new Map<string, unknown>()
  for (const ranked of buy_box.ranked) {
    if (Number(ranked.quantity_available) <= 0) continue
    const [price] = await commerce.listOfferPrices({
      offer_id: ranked.offer_id,
    })
    const seller_name = await resolveSellerDisplayName(partner, ranked.seller_id)
    const seller_slug = sellerPublicSlug(ranked.seller_id, seller_name)
    const view =
      price != null
        ? buildEffectivePriceView({
            base_price: Number(price.base_price),
            shipping_cost: Number(price.shipping_cost),
            extra_delivery_cost:
              price.extra_delivery_cost != null
                ? Number(price.extra_delivery_cost)
                : null,
            promo_price:
              price.promo_price != null ? Number(price.promo_price) : null,
            promo_starts_at: price.promo_starts_at ?? null,
            promo_ends_at: price.promo_ends_at ?? null,
          })
        : null
    const unitPrice = view ? view.unit_price : ranked.total_price
    let affiliate_commission_percent: number | null = null
    let affiliate_earnings: number | null = null
    if (productId) {
      const settings = await cachedSellerCommissionSettings(
        partner,
        ranked.seller_id,
        settingsCache
      )
      const rated = commissionForSellerProduct(settings, productId)
      affiliate_commission_percent = rated.totalPercent
      affiliate_earnings = Math.round(unitPrice * rated.totalPercent) / 100
    }
    views.push({
      offer_id: ranked.offer_id,
      seller_id: ranked.seller_id,
      seller_name,
      seller_slug,
      base_price: unitPrice,
      shipping_cost: view ? view.shipping_cost + view.extra_delivery_cost : 0,
      total_price: view ? view.total_customer_price : ranked.total_price,
      regular_total_price: view
        ? view.regular_price + view.shipping_cost + view.extra_delivery_cost
        : null,
      promo_active: Boolean(
        view?.promo_active && view.regular_price > view.unit_price
      ),
      quantity_available: ranked.quantity_available,
      rank: ranked.rank,
      is_winner: ranked.is_winner,
      score: ranked.score,
      affiliate_commission_percent,
      affiliate_earnings,
    })
  }
  return views
}

async function resolveSellerDisplayName(
  partner: PartnerModuleService,
  sellerId: string
): Promise<string> {
  try {
    const seller = await partner.retrieveSeller(sellerId, {
      relations: ["company"],
    })
    const company = (
      seller as { company?: { legal_name?: string } | null }
    ).company
    return company?.legal_name?.trim() || `Aanbieder ${sellerId.slice(-6)}`
  } catch {
    return `Aanbieder ${sellerId.slice(-6)}`
  }
}
