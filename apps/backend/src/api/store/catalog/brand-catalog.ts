import type { MedusaContainer } from "@medusajs/framework/types"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../../modules/verification"
import type VerificationModuleService from "../../../modules/verification/service"
import {
  computeMadeInEuropeScore,
  isAssemblyEuBand,
  isMaterialsEuLevel,
  isPartsEuLevel,
} from "../../../modules/verification/made-in-europe"
import {
  listPublishedCatalogProducts,
  resolveManufacturerName,
  slugifyCatalogEntityName,
  type CatalogListItem,
} from "./catalog-helpers"
import { sanitizeBrandPageDocument } from "../brands/brand-page-document"

type PublishedVersion = {
  id: string
  product_id: string
  version_number: number
}

export type CatalogProductionFacility = {
  id: string
  name: string
  country_code: string
  region: string | null
  description: string | null
  manufacturer_id: string | null
  source: "facility" | "product_origin"
  assembly_eu_band?: string | null
  parts_eu_level?: string | null
  materials_eu_level?: string | null
  primary_assembly_country?: string | null
  made_in_europe_score?: number | null
  is_made_in_europe?: boolean
}

export type CatalogBrandProfile = {
  id: string
  name: string
  slug: string
  intro: string | null
  story: string | null
  story_title: string | null
  story_image_url: string | null
  hero_image_url: string | null
  logo_url: string | null
  country_code: string | null
  product_count: number
  verified_product_count: number
  market_country: string
  market_intro: string | null
  market_story: string | null
  market_contact: string | null
  facilities: CatalogProductionFacility[]
  page_document: {
    category_slugs: string[]
    product_ids: string[]
    extra_sections: Array<{
      id: string
      type: "text" | "image" | "image_text"
      title?: string | null
      text?: string | null
      image_url?: string | null
    }>
  }
}

async function resolveBrandName(
  partner: PartnerModuleService,
  brandId: string
): Promise<string | null> {
  if (!brandId) return null
  try {
    const brand = await partner.retrieveBrand(brandId)
    return (brand as { name?: string }).name ?? null
  } catch {
    if (brandId.startsWith("brand_")) return null
    return brandId
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

async function findBrandBySlug(
  scope: MedusaContainer,
  normalizedSlug: string
): Promise<{
  id: string
  name: string
  slug: string
  intro: string | null
  story: string | null
  story_title: string | null
  story_image_url: string | null
  hero_image_url: string | null
  logo_url: string | null
  public_page_status: string
  page_document: unknown
} | null> {
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const brands = (await partner.listBrands({}, { take: 500 })) as Array<{
    id: string
    name?: string
    slug?: string | null
    intro?: string | null
    story?: string | null
    story_title?: string | null
    story_image_url?: string | null
    hero_image_url?: string | null
    website_url?: string | null
    logo_url?: string | null
    public_page_status?: string | null
    page_document?: unknown
  }>

  for (const row of brands) {
    const name = row.name?.trim()
    if (!name) continue
    const slug =
      row.slug?.trim() || slugifyCatalogEntityName(name)
    if (slug === normalizedSlug) {
      return {
        id: row.id,
        name,
        slug,
        intro: row.intro ?? null,
        story: row.story ?? null,
        story_title: row.story_title ?? null,
        story_image_url: row.story_image_url ?? null,
        hero_image_url: row.hero_image_url ?? null,
        logo_url: row.logo_url ?? null,
        public_page_status: row.public_page_status ?? "unpublished",
        page_document: row.page_document ?? {},
      }
    }
  }

  return null
}

async function loadFacilitiesForBrand(
  scope: MedusaContainer,
  brandId: string,
  productIds: string[]
): Promise<CatalogProductionFacility[]> {
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const verification = scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const facilities: CatalogProductionFacility[] = []
  const seen = new Set<string>()

  const stored = (await partner
    .listProductionFacilities({ brand_id: brandId, is_active: true }, { take: 50 })
    .catch(() => [])) as Array<{
    id: string
    name?: string
    country_code?: string
    region?: string | null
    description?: string | null
    manufacturer_id?: string | null
    assembly_eu_band?: string | null
    parts_eu_level?: string | null
    materials_eu_level?: string | null
    primary_assembly_country?: string | null
  }>

  for (const row of stored) {
    const key = `f:${row.id}`
    if (seen.has(key)) continue
    seen.add(key)
    let made_in_europe_score: number | null = null
    let is_made_in_europe = false
    if (
      row.assembly_eu_band &&
      row.parts_eu_level &&
      row.materials_eu_level &&
      isAssemblyEuBand(row.assembly_eu_band) &&
      isPartsEuLevel(row.parts_eu_level) &&
      isMaterialsEuLevel(row.materials_eu_level)
    ) {
      const scored = computeMadeInEuropeScore({
        assembly_eu_band: row.assembly_eu_band,
        parts_eu_level: row.parts_eu_level,
        materials_eu_level: row.materials_eu_level,
        primary_assembly_country:
          row.primary_assembly_country ?? row.country_code ?? null,
      })
      made_in_europe_score = scored.score
      is_made_in_europe = scored.is_made_in_europe
    }
    facilities.push({
      id: row.id,
      name: row.name ?? "Productielocatie",
      country_code: (row.country_code ?? "EU").toUpperCase(),
      region: row.region ?? null,
      description: row.description ?? null,
      manufacturer_id: row.manufacturer_id ?? null,
      source: "facility",
      assembly_eu_band: row.assembly_eu_band ?? null,
      parts_eu_level: row.parts_eu_level ?? null,
      materials_eu_level: row.materials_eu_level ?? null,
      primary_assembly_country: row.primary_assembly_country ?? null,
      made_in_europe_score,
      is_made_in_europe,
    })
  }

  for (const productId of productIds) {
    const versions = (await productCloud.listProductVersions(
      { product_id: productId, publication_status: "Gepubliceerd" },
      { order: { version_number: "DESC" }, take: 1 }
    )) as Array<{ id: string }>
    const versionId = versions[0]?.id
    if (!versionId) continue

    const origins = (await verification.listProductOrigins(
      { product_version_id: versionId },
      { take: 5 }
    )) as Array<{
      id: string
      production_country?: string
      production_location?: string
      manufacturer_id?: string
    }>

    for (const origin of origins) {
      const country = (origin.production_country ?? "").trim()
      const location = (origin.production_location ?? "").trim()
      if (!country && !location) continue
      const key = `o:${country}:${location}`
      if (seen.has(key)) continue
      seen.add(key)
      facilities.push({
        id: origin.id,
        name: location || country,
        country_code: country.toUpperCase() || "EU",
        region: location || null,
        description: null,
        manufacturer_id: origin.manufacturer_id ?? null,
        source: "product_origin",
      })
    }
  }

  return facilities
}

/**
 * Publieke merkpagina: merkprofiel + marktcontent + productiefaciliteiten + producten.
 */
export async function loadBrandCatalogPage(
  scope: MedusaContainer,
  slug: string,
  opts: { region_code?: string; market_country?: string } = {}
): Promise<{ brand: CatalogBrandProfile; products: CatalogListItem[] } | null> {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) return null

  const match = await findBrandBySlug(scope, normalizedSlug)
  if (!match || match.public_page_status !== "published") return null

  const region_code = opts.region_code ?? "NL"
  const market_country = (opts.market_country ?? region_code)
    .trim()
    .toUpperCase()

  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const { products } = await listPublishedCatalogProducts(scope, {
    brand_id: match.id,
    region_code,
    take: 200,
  })

  const country_code = await resolveBrandCountry(partner, match.id)
  const verified_product_count = products.filter(
    (p) => p.lifecycle_status === "Verified™"
  ).length

  const marketRows = (await partner
    .listBrandMarketContents({ brand_id: match.id, country_code: market_country }, {
      take: 1,
    })
    .catch(() => [])) as Array<{
    intro?: string | null
    story?: string | null
    contact_info?: string | null
  }>
  const market = marketRows[0]

  const facilities = await loadFacilitiesForBrand(
    scope,
    match.id,
    products.map((p) => p.id)
  )

  return {
    brand: {
      id: match.id,
      name: match.name,
      slug: match.slug,
      intro: match.intro,
      story: match.story,
      story_title: match.story_title,
      story_image_url: match.story_image_url,
      hero_image_url: match.hero_image_url,
      logo_url: match.logo_url,
      country_code,
      product_count: products.length,
      verified_product_count,
      market_country,
      market_intro: market?.intro ?? null,
      market_story: market?.story ?? null,
      market_contact: market?.contact_info ?? null,
      facilities,
      page_document: sanitizeBrandPageDocument(match.page_document),
    },
    products,
  }
}

/**
 * Resolve merk-slug voor legacy producent-URL (redirect naar merk).
 */
export async function resolveBrandSlugForProducerSlug(
  scope: MedusaContainer,
  producerSlug: string
): Promise<string | null> {
  const normalizedSlug = producerSlug.trim().toLowerCase()
  if (!normalizedSlug) return null

  const brandMatch = await findBrandBySlug(scope, normalizedSlug)
  if (brandMatch?.public_page_status === "published") return brandMatch.slug

  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const manufacturers = (await partner.listManufacturers(
    {},
    { take: 500 }
  )) as Array<{ id: string; name?: string }>

  let manufacturerId: string | null = null
  for (const row of manufacturers) {
    const name = row.name?.trim()
    if (!name) continue
    if (slugifyCatalogEntityName(name) === normalizedSlug) {
      manufacturerId = row.id
      break
    }
  }

  if (!manufacturerId) {
    const versions = (await productCloud.listProductVersions(
      { publication_status: "Gepubliceerd" },
      { take: 200 }
    )) as PublishedVersion[]
    const seen = new Set<string>()
    for (const version of versions) {
      if (seen.has(version.product_id)) continue
      seen.add(version.product_id)
      let product: { manufacturer_id?: string }
      try {
        product = await productCloud.retrieveProduct(version.product_id)
      } catch {
        continue
      }
      const mId = product.manufacturer_id?.trim()
      if (!mId) continue
      const mName = await resolveManufacturerName(partner, mId)
      if (mName && slugifyCatalogEntityName(mName) === normalizedSlug) {
        manufacturerId = mId
        break
      }
    }
  }

  if (!manufacturerId) return null

  const versions = (await productCloud.listProductVersions(
    { publication_status: "Gepubliceerd" },
    { take: 500 }
  )) as PublishedVersion[]
  const seenProduct = new Set<string>()
  for (const version of versions) {
    if (seenProduct.has(version.product_id)) continue
    seenProduct.add(version.product_id)
    let product: { brand_id?: string; manufacturer_id?: string }
    try {
      product = await productCloud.retrieveProduct(version.product_id)
    } catch {
      continue
    }
    if (product.manufacturer_id !== manufacturerId) continue
    const brandId = product.brand_id?.trim()
    if (!brandId) continue
    const name = await resolveBrandName(partner, brandId)
    if (!name) continue
    return slugifyCatalogEntityName(name)
  }

  return null
}

export async function listPublishedBrandSummaries(
  scope: MedusaContainer
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const brands = (await partner
    .listBrands({ public_page_status: "published" }, { take: 200 })
    .catch(() => [])) as Array<{
    id: string
    name?: string
    slug?: string | null
    public_page_status?: string | null
  }>
  const out: Array<{ id: string; name: string; slug: string }> = []
  for (const row of brands) {
    const name = row.name?.trim()
    if (!name) continue
    if ((row.public_page_status ?? "unpublished") !== "published") continue
    out.push({
      id: row.id,
      name,
      slug: row.slug?.trim() || slugifyCatalogEntityName(name),
    })
  }
  return out
}
