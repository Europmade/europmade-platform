import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import type PartnerModuleService from "../../../modules/partner/service"
import type VerificationModuleService from "../../../modules/verification/service"
import type { ManufacturerGpsrSource } from "../../../modules/product-cloud/gpsr-manufacturer"
import { resolveCatalogGtinValue } from "../../../modules/product-cloud/concept-identifier"
import type { ProductCloudPreview } from "./product-preview"

export const LIST_QUERY_TAKE = 2000

function pickWorkingVersion<
  T extends { publication_status: string; version_number: number },
>(versions: T[]): T | null {
  const concept = versions
    .filter(
      (v) =>
        v.publication_status === "Concept" ||
        v.publication_status === "In review"
    )
    .sort((a, b) => b.version_number - a.version_number)[0]
  if (concept) return concept
  const published = versions
    .filter((v) => v.publication_status === "Gepubliceerd")
    .sort((a, b) => b.version_number - a.version_number)[0]
  if (published) return published
  return (
    [...versions].sort((a, b) => b.version_number - a.version_number)[0] ?? null
  )
}

type VersionRow = {
  id: string
  product_id: string
  version_number: number
  title: string
  publication_status: string
}

type MediaRow = {
  id: string
  product_version_id: string
  media_type: string
  storage_reference: string
  metadata?: Record<string, unknown> | null
}

type AttrDefRow = {
  id: string
  category_id: string
  name: string
  code: string | null
  is_required: boolean
  requirement_tier?: string | null
  data_type: string
  unit: string | null
  help_text?: string | null
  is_active?: boolean | null
  sort_order: number
  option_values: string | null
}

type AttrValRow = {
  id: string
  product_version_id: string
  attribute_definition_id: string
  value: string
}

type VariantRow = {
  id: string
  product_id: string
  variant_type: string
  variant_value: string
}

type IdentifierRow = {
  id: string
  product_variant_id: string
  identifier_type: string
  identifier_value: string
  country_scope?: string | null
}

function groupByKey<T>(
  rows: T[],
  key: (row: T) => string | null | undefined
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    if (!k) continue
    const list = map.get(k) || []
    list.push(row)
    map.set(k, list)
  }
  return map
}

export type SellerListDataCache = {
  skipEnsureCatalog: true
  versionsByProduct: Map<string, VersionRow[]>
  previewByProduct: Map<string, ProductCloudPreview>
  mediaByVersion: Map<string, MediaRow[]>
  variantsByProduct: Map<string, VariantRow[]>
  identifiersByVariant: Map<string, IdentifierRow[]>
  categoryIdsByProduct: Map<string, string[]>
  categoriesById: Map<string, { id: string; name: string; slug?: string | null }>
  defsByCategory: Map<string, AttrDefRow[]>
  valuesByVersion: Map<string, AttrValRow[]>
  translationsByVersion: Map<
    string,
    Array<{
      field_name: string
      language_code: string
      translation_status: string
      value?: string | null
    }>
  >
  evidenceByProduct: Map<string, Array<Record<string, unknown>>>
  manufacturerById: Map<string, ManufacturerGpsrSource | null>
  mieByProduct: Map<
    string,
    {
      claimed: boolean
      facilityId: string | null
      facility: ManufacturerGpsrSource | null
    }
  >
  shippingById: Map<
    string,
    {
      id: string
      name: string
      status: string
      active_country_count: number
      min_shipping_cost: number | null
    } | null
  >
  brandNameById: Map<string, string | null>
}

export async function listVersionsByProductId(
  productCloud: ProductCloudModuleService,
  productIds: string[]
): Promise<Map<string, VersionRow[]>> {
  if (productIds.length === 0) return new Map()
  const versions = (await productCloud.listProductVersions(
    { product_id: productIds },
    { take: LIST_QUERY_TAKE }
  )) as VersionRow[]
  return groupByKey(versions, (v) => v.product_id)
}

export async function loadSellerListDataCache(opts: {
  productCloud: ProductCloudModuleService
  commerce: CommerceCloudModuleService | null
  partner: PartnerModuleService | null
  verification: VerificationModuleService | null
  products: Array<{
    id: string
    brand_id: string
    manufacturer_id: string
    lifecycle_status: string
    shipping_profile_id?: string | null
  }>
  sellerId: string
  versionsByProduct?: Map<string, VersionRow[]>
}): Promise<SellerListDataCache> {
  const cache: SellerListDataCache = {
    skipEnsureCatalog: true,
    versionsByProduct: opts.versionsByProduct || new Map(),
    previewByProduct: new Map(),
    mediaByVersion: new Map(),
    variantsByProduct: new Map(),
    identifiersByVariant: new Map(),
    categoryIdsByProduct: new Map(),
    categoriesById: new Map(),
    defsByCategory: new Map(),
    valuesByVersion: new Map(),
    translationsByVersion: new Map(),
    evidenceByProduct: new Map(),
    manufacturerById: new Map(),
    mieByProduct: new Map(),
    shippingById: new Map(),
    brandNameById: new Map(),
  }
  const productIds = opts.products.map((p) => p.id)
  if (productIds.length === 0) return cache

  if (cache.versionsByProduct.size === 0) {
    cache.versionsByProduct = await listVersionsByProductId(
      opts.productCloud,
      productIds
    )
  }

  const [variants, links, evidenceRows] = await Promise.all([
    opts.productCloud.listProductVariants(
      { product_id: productIds },
      { take: LIST_QUERY_TAKE }
    ) as Promise<VariantRow[]>,
    opts.productCloud.listProductCategories(
      { product_id: productIds },
      { take: LIST_QUERY_TAKE }
    ) as Promise<Array<{ product_id: string; category_id: string }>>,
    opts.verification
      ? (opts.verification.listProductOriginEvidences(
          { product_id: productIds },
          { take: LIST_QUERY_TAKE }
        ) as Promise<Array<Record<string, unknown> & { product_id?: string }>>)
      : Promise.resolve(
          [] as Array<Record<string, unknown> & { product_id?: string }>
        ),
  ])

  cache.variantsByProduct = groupByKey(variants, (v) => v.product_id)
  const categoryIdsByProduct = new Map<string, string[]>()
  for (const link of links) {
    const list = categoryIdsByProduct.get(link.product_id) || []
    list.push(link.category_id)
    categoryIdsByProduct.set(link.product_id, list)
  }
  cache.categoryIdsByProduct = categoryIdsByProduct
  cache.evidenceByProduct = groupByKey(
    evidenceRows,
    (row) => row.product_id
  )

  const variantIds = variants.map((v) => v.id)
  const identifiers = variantIds.length
    ? ((await opts.productCloud.listIdentifiers(
        { product_variant_id: variantIds },
        { take: LIST_QUERY_TAKE }
      )) as IdentifierRow[])
    : []
  cache.identifiersByVariant = groupByKey(
    identifiers,
    (row) => row.product_variant_id
  )

  const categoryIds = [...new Set(links.map((l) => l.category_id))]
  const categories = categoryIds.length
    ? ((await opts.productCloud.listCategories(
        { id: categoryIds },
        { take: LIST_QUERY_TAKE }
      )) as Array<{ id: string; name: string; slug?: string | null }>)
    : []
  cache.categoriesById = new Map(categories.map((c) => [c.id, c]))

  const defs = categoryIds.length
    ? ((await opts.productCloud.listAttributeDefinitions(
        { category_id: categoryIds },
        { take: LIST_QUERY_TAKE }
      )) as AttrDefRow[])
    : []
  cache.defsByCategory = groupByKey(
    defs.filter((d) => d.is_active !== false),
    (d) => d.category_id
  )

  const workingIds: string[] = []
  const originVersionIds: string[] = []
  for (const product of opts.products) {
    const productVersions = cache.versionsByProduct.get(product.id) || []
    const working = pickWorkingVersion(productVersions)
    if (working) workingIds.push(working.id)
    const published = [...productVersions]
      .filter((v) => v.publication_status === "Gepubliceerd")
      .sort((a, b) => b.version_number - a.version_number)[0]
    if (published) originVersionIds.push(published.id)
    else if (working) originVersionIds.push(working.id)
  }

  const [media, values, translations] = await Promise.all([
    workingIds.length
      ? (opts.productCloud.listProductMedias(
          { product_version_id: workingIds },
          { take: LIST_QUERY_TAKE }
        ) as Promise<MediaRow[]>)
      : Promise.resolve([] as MediaRow[]),
    workingIds.length
      ? (opts.productCloud.listAttributeValues(
          { product_version_id: workingIds },
          { take: LIST_QUERY_TAKE }
        ) as Promise<AttrValRow[]>)
      : Promise.resolve([] as AttrValRow[]),
    workingIds.length
      ? (opts.productCloud.listProductTranslations(
          { entity_type: "product_version", entity_id: workingIds },
          { take: LIST_QUERY_TAKE }
        ) as Promise<
          Array<{
            entity_id?: string
            field_name: string
            language_code: string
            translation_status: string
            value?: string | null
          }>
        >)
      : Promise.resolve(
          [] as Array<{
            entity_id?: string
            field_name: string
            language_code: string
            translation_status: string
            value?: string | null
          }>
        ),
  ])
  cache.mediaByVersion = groupByKey(media, (m) => m.product_version_id)
  cache.valuesByVersion = groupByKey(values, (v) => v.product_version_id)
  cache.translationsByVersion = groupByKey(translations, (row) => row.entity_id)

  const manufacturerIds = [
    ...new Set(opts.products.map((p) => p.manufacturer_id).filter(Boolean)),
  ]
  if (opts.partner && manufacturerIds.length) {
    try {
      const manufacturers = (await opts.partner.listManufacturers(
        { id: manufacturerIds },
        { take: LIST_QUERY_TAKE }
      )) as Array<ManufacturerGpsrSource & { id: string }>
      for (const row of manufacturers) cache.manufacturerById.set(row.id, row)
    } catch {
      /* per-row fallback */
    }
  }

  const brandIds = [...new Set(opts.products.map((p) => p.brand_id).filter(Boolean))]
  if (opts.partner && brandIds.length) {
    try {
      const brands = (await opts.partner.listBrands(
        { id: brandIds },
        { take: LIST_QUERY_TAKE }
      )) as Array<{ id: string; name?: string }>
      for (const brand of brands) {
        cache.brandNameById.set(brand.id, brand.name ?? null)
      }
    } catch {
      /* per-row fallback */
    }
  }

  let originRows: Array<{
    product_version_id: string
    production_facility_id?: string | null
    assembly_eu_band?: string | null
    parts_eu_level?: string | null
    materials_eu_level?: string | null
  }> = []
  if (opts.verification && originVersionIds.length) {
    try {
      originRows = (await opts.verification.listProductOrigins(
        { product_version_id: originVersionIds },
        { take: LIST_QUERY_TAKE }
      )) as typeof originRows
    } catch {
      originRows = []
    }
  }
  const originByVersion = new Map(
    originRows.map((row) => [row.product_version_id, row])
  )
  const facilityIds = [
    ...new Set(
      originRows
        .map((row) => row.production_facility_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const facilityById = new Map<string, ManufacturerGpsrSource & { id?: string }>()
  if (opts.partner && facilityIds.length) {
    try {
      const facilities = (await opts.partner.listProductionFacilities(
        { id: facilityIds },
        { take: LIST_QUERY_TAKE }
      )) as Array<ManufacturerGpsrSource & { id: string }>
      for (const facility of facilities) facilityById.set(facility.id, facility)
    } catch {
      /* optional */
    }
  }

  const shippingIds = [
    ...new Set(
      opts.products
        .map((p) => p.shipping_profile_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  if (opts.commerce && shippingIds.length) {
    try {
      const profiles = await opts.commerce.listSellerShippingProfiles(
        { id: shippingIds, seller_id: opts.sellerId },
        { take: LIST_QUERY_TAKE }
      )
      const { enrichShippingProfile } = await import(
        "../../../modules/commerce-cloud/shipping-profile-engine"
      )
      for (const profile of profiles) {
        if (profile.seller_id !== opts.sellerId) continue
        const enriched = enrichShippingProfile(profile, 0)
        cache.shippingById.set(enriched.id, {
          id: enriched.id,
          name: enriched.name,
          status: enriched.status,
          active_country_count: enriched.active_country_count,
          min_shipping_cost: enriched.min_shipping_cost,
        })
      }
    } catch {
      /* optional */
    }
  }

  for (const product of opts.products) {
    const productVersions = cache.versionsByProduct.get(product.id) || []
    const productVariants = cache.variantsByProduct.get(product.id) || []
    const productIdentifiers = productVariants.flatMap(
      (variant) => cache.identifiersByVariant.get(variant.id) || []
    )
    const catIds = cache.categoryIdsByProduct.get(product.id) || []
    const categoryNames = catIds
      .map((id) => cache.categoriesById.get(id)?.name)
      .filter((name): name is string => Boolean(name))
    const gtin = productIdentifiers.find(
      (i) =>
        i.identifier_type === "GTIN" &&
        resolveCatalogGtinValue(
          i.identifier_type,
          i.identifier_value,
          i.country_scope
        )
    )
    const mpn = productIdentifiers.find((i) => i.identifier_type === "MPN")
    const preferred = gtin || mpn || productIdentifiers[0] || null
    const publishedTitle = [...productVersions]
      .filter((v) => v.publication_status === "Gepubliceerd")
      .sort((a, b) => b.version_number - a.version_number)[0]
    const latestTitle = [...productVersions].sort(
      (a, b) => b.version_number - a.version_number
    )[0]
    cache.previewByProduct.set(product.id, {
      product_id: product.id,
      title: publishedTitle?.title ?? latestTitle?.title ?? null,
      brand_id: product.brand_id,
      manufacturer_id: product.manufacturer_id,
      lifecycle_status: product.lifecycle_status,
      category_names: categoryNames,
      identifier_id: preferred?.id ?? null,
      identifier_type: preferred?.identifier_type ?? null,
      identifier_value: preferred
        ? preferred.identifier_type === "GTIN"
          ? resolveCatalogGtinValue(
              preferred.identifier_type,
              preferred.identifier_value,
              preferred.country_scope
            )
          : preferred.identifier_value
        : null,
    })

    const working = pickWorkingVersion(productVersions)
    const published = [...productVersions]
      .filter((v) => v.publication_status === "Gepubliceerd")
      .sort((a, b) => b.version_number - a.version_number)[0]
    const origin = originByVersion.get((published || working)?.id || "")
    const facility = origin?.production_facility_id
      ? facilityById.get(origin.production_facility_id) ?? null
      : null
    cache.mieByProduct.set(product.id, {
      claimed: Boolean(
        origin?.assembly_eu_band &&
          origin.parts_eu_level &&
          origin.materials_eu_level
      ),
      facilityId: origin?.production_facility_id ?? null,
      facility,
    })
  }

  return cache
}
