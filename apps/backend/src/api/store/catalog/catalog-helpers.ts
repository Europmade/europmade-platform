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
  opts: { category?: string; q?: string; region_code?: string; take?: number } = {}
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
  const take = opts.take ?? 100

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

  const items: CatalogListItem[] = []
  for (const version of published) {
    const preview = await buildProductCloudPreview(
      productCloud,
      version.product_id
    )
    // Alleen actieve producten in de publieke catalogus (lifecycle ≠ gearchiveerd).
    if (preview.lifecycle_status === "Gearchiveerd") continue

    const brand = await resolveBrandName(partner, preview.brand_id)
    const country_code = await resolveBrandCountry(partner, preview.brand_id)

    if (categoryFilter) {
      const match = preview.category_names.some((name) => {
        const n = name.toLowerCase()
        return n === categoryFilter || n.includes(categoryFilter)
      })
      if (!match) continue
    }

    if (q) {
      const hay = [
        preview.title ?? "",
        brand ?? "",
        ...preview.category_names,
        preview.identifier_value ?? "",
      ]
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) continue
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

    items.push({
      id: version.product_id,
      title: preview.title ?? version.title,
      description: version.description || null,
      lifecycle_status: preview.lifecycle_status,
      brand_name: brand,
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

  return items
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
      country_code,
    },
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
    return null
  }
}

async function resolveManufacturerName(
  partner: PartnerModuleService,
  manufacturerId: string
): Promise<string | null> {
  if (!manufacturerId) return null
  try {
    const m = await partner.retrieveManufacturer(manufacturerId)
    return (m as { name?: string }).name ?? null
  } catch {
    return null
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
