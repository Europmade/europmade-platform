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
import { slugifyCategoryName } from "../../../modules/product-cloud/category-attributes"
import { loadMadeInEuropeForProduct } from "../product-cloud/made-in-europe-helpers"

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

export type CatalogOfferView = {
  offer_id: string
  seller_id: string
  seller_name: string
  base_price: number
  shipping_cost: number
  total_price: number
  quantity_available: number
  rank: number
  is_winner: boolean
  score: number
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
    sort?:
      | "popularity"
      | "price_asc"
      | "price_desc"
      | "rating_desc"
      | "name_asc"
      | "name_desc"
  } = {}
): Promise<CatalogListItem[]> {
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const commerce = scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const reviews = scope.resolve(REVIEW_MODULE) as ReviewModuleService

  const region = (opts.region_code ?? "NL").toUpperCase()
  const take = Math.max(opts.take ?? 400, (opts.offset ?? 0) + (opts.limit ?? 24))

  const versions = (await productCloud.listProductVersions(
    { publication_status: "Gepubliceerd" },
    { order: { version_number: "DESC" }, take: take * 3 }
  )) as PublishedVersion[]

  const seen = new Set<string>()
  const published: PublishedVersion[] = []
  for (const v of versions) {
    if (seen.has(v.product_id)) continue
    seen.add(v.product_id)
    published.push(v)
    if (published.length >= take) break
  }

  const categoryFilter = opts.category?.trim().toLowerCase() ?? ""
  const q = opts.q?.trim().toLowerCase() ?? ""
  const brandFilter = opts.brand_id?.trim().toLowerCase() ?? ""
  const manufacturerFilter = opts.manufacturer_id?.trim().toLowerCase() ?? ""

  const items: CatalogListItem[] = []
  const seenProductIds = new Set<string>()
  for (const version of published) {
    const preview = await buildProductCloudPreview(
      productCloud,
      version.product_id
    )
    // Alleen actieve producten in de publieke catalogus (lifecycle ≠ gearchiveerd).
    if (preview.lifecycle_status === "Gearchiveerd") continue

    const brand = await resolveBrandName(partner, preview.brand_id)
    const manufacturer_name = await resolveManufacturerName(
      partner,
      preview.manufacturer_id
    )
    const country_code = await resolveBrandCountry(partner, preview.brand_id)
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
    if (manufacturerFilter && !manufacturerHay.includes(manufacturerFilter)) continue

    if (categoryFilter) {
      const match = preview.category_names.some((name) => {
        const n = name.toLowerCase()
        const slug = slugifyCategoryName(name)
        return (
          n === categoryFilter ||
          n.includes(categoryFilter) ||
          slug === categoryFilter ||
          slug.includes(categoryFilter)
        )
      })
      if (!match) continue
    }

    if (q) {
      const hay = [
        preview.title ?? "",
        brand ?? "",
        manufacturer_name ?? "",
        ...preview.category_names,
        preview.identifier_value ?? "",
      ]
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) continue
    }

    if (opts.country_code) {
      const wantedCountry = opts.country_code.trim().toUpperCase()
      if ((country_code ?? "").toUpperCase() !== wantedCountry) continue
    }

    if (opts.verified && preview.lifecycle_status !== "Verified™") {
      continue
    }

    let offer_count = 0
    let from_price: number | null = null
    if (preview.identifier_id) {
      const pricing = await minOfferPricing(
        commerce,
        preview.identifier_id,
        region
      )
      offer_count = pricing.offer_count
      from_price = pricing.from_price
    }

    const productReviews = await reviews.listReviews(
      { product_id: version.product_id, review_type: "Productreview" },
      { take: 200 }
    )
    const review_count = productReviews.length
    const average_review_score =
      review_count > 0
        ? productReviews.reduce((s, r) => s + Number(r.score), 0) / review_count
        : null

    if (opts.price_min != null && (from_price == null || from_price < opts.price_min)) {
      continue
    }
    if (opts.price_max != null && (from_price == null || from_price > opts.price_max)) {
      continue
    }

    if (seenProductIds.has(version.product_id)) continue
    seenProductIds.add(version.product_id)

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
      average_review_score,
      review_count,
    })
  }

  const sort = opts.sort ?? "popularity"
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
      case "popularity":
      default:
        return b.offer_count - a.offer_count || (b.average_review_score ?? 0) - (a.average_review_score ?? 0)
    }
  })

  const offset = Math.max(0, opts.offset ?? 0)
  const limit = Math.max(1, opts.limit ?? 24)
  return items.slice(offset, offset + limit)
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

  const products = await listPublishedCatalogProducts(scope, {
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
    },
    made_in_europe,
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
  let from_price: number | null = null
  let offer_count = 0
  for (const offer of offers) {
    const [inventory] = await commerce.listOfferInventories({
      offer_id: offer.id,
    })
    const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
    if (!inventory || !price) continue
    if (Number(inventory.quantity_available) <= 0) continue
    offer_count += 1
    const total = Number(price.base_price) + Number(price.shipping_cost)
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
    views.push({
      offer_id: ranked.offer_id,
      seller_id: ranked.seller_id,
      seller_name,
      base_price: price ? Number(price.base_price) : ranked.total_price,
      shipping_cost: price ? Number(price.shipping_cost) : 0,
      total_price: ranked.total_price,
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
