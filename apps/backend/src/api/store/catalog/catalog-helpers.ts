import { persistMediaReference } from "@europmade/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
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
  productMatchesCategoryFilter,
} from "../../../modules/product-cloud/category-attributes"
import { loadMadeInEuropeForProduct } from "../product-cloud/made-in-europe-helpers"
import {
  findClaimForProductRefs,
  toPublicEuropeanOwnership,
} from "../product-cloud/european-ownership-helpers"
import { VERIFICATION_MODULE } from "../../../modules/verification"
import type VerificationModuleService from "../../../modules/verification/service"
import { buildEffectivePriceView } from "../../../modules/commerce-cloud/offer-pricing"
import { toPublicProductLinkGroup } from "../../../modules/product-cloud/product-link-groups"

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
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
  country_code: string | null
  offer_count: number
  from_price: number | null
  average_review_score: number | null
  review_count: number
  image_url: string | null
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
  quantity_available: number
  rank: number
  is_winner: boolean
  score: number
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
  const scanTake = q || idSet ? 8000 : Math.max(opts.take ?? 400, offset + limit)
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

  const categoryFilter = opts.category?.trim().toLowerCase() ?? ""
  const brandFilter = opts.brand_id?.trim().toLowerCase() ?? ""
  const manufacturerFilter = opts.manufacturer_id?.trim().toLowerCase() ?? ""

  const qProductIds = q ? await findPublishedProductIdsByQuery(productCloud, q) : new Set<string>()

  const brandNameById = new Map<string, string | null>()
  const manufacturerNameById = new Map<string, string | null>()
  const brandCountryById = new Map<string, string | null>()
  const versionIdByProduct = new Map<string, string>()
  const brandIdByProduct = new Map<string, string>()
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

  async function cachedBrandName(brandId: string): Promise<string | null> {
    if (brandNameById.has(brandId)) return brandNameById.get(brandId) ?? null
    const name = await resolveBrandName(partner, brandId)
    brandNameById.set(brandId, name)
    return name
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

  const items: CatalogListItem[] = []
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
      const pricing = await minOfferPricing(commerce, identifierId, region)
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

    versionIdByProduct.set(version.product_id, version.id)
    brandIdByProduct.set(version.product_id, preview.brand_id)

    items.push({
      id: version.product_id,
      title: preview.title ?? version.title,
      description: version.description || null,
      lifecycle_status: preview.lifecycle_status,
      brand_name: brand,
      manufacturer_id: preview.manufacturer_id || null,
      manufacturer_name,
      category_names: preview.category_names,
      identifier_id: preview.identifier_id,
      identifier_type: preview.identifier_type,
      identifier_value: preview.identifier_value,
      country_code,
      offer_count,
      from_price,
      average_review_score: null,
      review_count: 0,
      image_url: null,
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
          return (a.from_price ?? Number.MAX_SAFE_INTEGER) - (b.from_price ?? Number.MAX_SAFE_INTEGER)
        case "price_desc":
          return (b.from_price ?? 0) - (a.from_price ?? 0)
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
          return (b.id ?? "").localeCompare(a.id ?? "")
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
      item.brand_name = brand_name
      item.manufacturer_name = manufacturer_name
      item.country_code = country_code
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
  if (!version) return null

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
    offers = await enrichRankedOffers(commerce, partner, buy_box)
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

  const mie = await loadMadeInEuropeForProduct(scope, productId)
  const made_in_europe = mie?.score
    ? {
        is_made_in_europe: mie.score.is_made_in_europe,
        score: mie.score.score,
        assembly_points: mie.score.assembly_points,
        parts_points: mie.score.parts_points,
        materials_points: mie.score.materials_points,
        max_assembly: mie.score.max_assembly,
        max_parts: mie.score.max_parts,
        max_materials: mie.score.max_materials,
        assembly_eu_band: mie.score.assembly_eu_band,
        parts_eu_level: mie.score.parts_eu_level,
        materials_eu_level: mie.score.materials_eu_level,
        primary_assembly_country: mie.score.primary_assembly_country,
        facility: mie.facility
          ? {
              id: mie.facility.id,
              name: mie.facility.name,
              country_code: mie.facility.country_code,
              region: mie.facility.region ?? null,
            }
          : null,
      }
    : null

  let european_ownership = null as ReturnType<typeof toPublicEuropeanOwnership>
  const brandId = String(
    (product as { brand_id?: string | null }).brand_id || ""
  ).trim()
  const manufacturerId = String(
    (product as { manufacturer_id?: string | null }).manufacturer_id || ""
  ).trim()
  if (brandId || manufacturerId) {
    try {
      const verification = scope.resolve(
        VERIFICATION_MODULE
      ) as VerificationModuleService
      const claim = await findClaimForProductRefs(verification, {
        brand_id: brandId || null,
        manufacturer_id: manufacturerId || null,
      })
      european_ownership = toPublicEuropeanOwnership(claim)
    } catch {
      european_ownership = null
    }
  }

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

  return {
    product: {
      id: product.id,
      title: preview.title ?? version.title,
      description: version.description,
      lifecycle_status: product.lifecycle_status,
      brand_name,
      manufacturer_name,
      category_names: preview.category_names,
      identifier_id: preview.identifier_id,
      identifier_type: preview.identifier_type,
      identifier_value: preview.identifier_value,
      country_code: made_in_europe?.primary_assembly_country ?? country_code,
      image_url: await resolvePrimaryImageUrl(productCloud, version.id),
      media: await resolveProductMediaItems(productCloud, version.id),
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

async function resolvePrimaryImageUrl(
  productCloud: ProductCloudModuleService,
  versionId: string
): Promise<string | null> {
  const items = await resolveProductMediaItems(productCloud, versionId)
  const primary =
    items.find((m) => m.media_type === "Hoofdafbeelding") ||
    items.find((m) => m.media_type !== "Video")
  return primary?.storage_reference ?? null
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

async function minOfferPricing(
  commerce: CommerceCloudModuleService,
  identifierId: string,
  regionCode: string
): Promise<{ offer_count: number; from_price: number | null }> {
  const offers = await commerce.listOffers({
    identifier_id: identifierId,
    region_code: regionCode,
  })
  const active = offers.filter(
    (offer) => (offer.sales_status ?? "active") === "active"
  )
  const priced = await Promise.all(
    active.map(async (offer) => {
      const [[inventory], [price]] = await Promise.all([
        commerce.listOfferInventories({ offer_id: offer.id }),
        commerce.listOfferPrices({ offer_id: offer.id }),
      ])
      if (!inventory || !price) return null
      if (Number(inventory.quantity_available) <= 0) return null
      const view = buildEffectivePriceView({
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
      return view.total_customer_price
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

async function enrichRankedOffers(
  commerce: CommerceCloudModuleService,
  partner: PartnerModuleService,
  buy_box: Awaited<ReturnType<typeof loadBuyBoxForIdentifier>>
): Promise<CatalogOfferView[]> {
  const views: CatalogOfferView[] = []
  for (const ranked of buy_box.ranked) {
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
    views.push({
      offer_id: ranked.offer_id,
      seller_id: ranked.seller_id,
      seller_name,
      seller_slug,
      base_price: view ? view.unit_price : ranked.total_price,
      shipping_cost: view ? view.shipping_cost + view.extra_delivery_cost : 0,
      total_price: view ? view.total_customer_price : ranked.total_price,
      quantity_available: ranked.quantity_available,
      rank: ranked.rank,
      is_winner: ranked.is_winner,
      score: ranked.score,
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
