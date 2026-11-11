import { createHash } from "node:crypto"
import { isEuMarketCode } from "@europmade/types"
import {
  categoryCmsListExclusion,
  type CategoryCmsBlockType,
  type CategoryCmsProfile,
} from "@europmade/utils"
import {
  completeMadeInEuropeBands,
  computeMadeInEuropeScore,
} from "../verification/made-in-europe"
import { parentIdOf } from "./category-admin"

/**
 * Read-only Product Cloud context for one category.
 * No CMS writes, no generated copy, no Commerce fields.
 */
export const CATEGORY_FACT_PACKAGE_VERSION = 1

export type CategoryFactSource = {
  categories: CategoryFactCategory[]
  products: CategoryFactProduct[]
  versions: CategoryFactVersion[]
  links: CategoryFactLink[]
  brands: CategoryFactBrand[]
  origins: CategoryFactOrigin[]
  facilities: CategoryFactFacility[]
  definitions: CategoryFactDefinition[]
  values: CategoryFactValue[]
  relations: CategoryFactRelation[]
  evidence: CategoryFactEvidence[]
}

export type CategoryFactCategory = {
  id: string
  name: string
  slug: string | null
  parent_id: string | null
}

export type CategoryFactProduct = {
  id: string
  brand_id: string | null
  lifecycle_status: string
}

export type CategoryFactVersion = {
  id: string
  product_id: string
  version_number: number
  publication_status: string
  title: string
}

export type CategoryFactLink = {
  product_id: string
  category_id: string
}

export type CategoryFactBrand = {
  id: string
  name: string
  logo_url: string | null
  owner_company_country: string | null
}

export type CategoryFactOrigin = {
  product_version_id: string
  production_country: string | null
  primary_assembly_country: string | null
  status: string | null
  production_facility_id: string | null
  assembly_eu_band: string | null
  parts_eu_level: string | null
  materials_eu_level: string | null
}

export type CategoryFactFacility = {
  id: string
  name: string
  country_code: string | null
}

export type CategoryFactDefinition = {
  id: string
  category_id: string
  code: string | null
  name: string
  is_filterable: boolean
  is_comparable: boolean
  is_active: boolean
  requirement_tier: string | null
}

export type CategoryFactValue = {
  product_version_id: string
  attribute_definition_id: string
  value: string
}

export type CategoryFactRelation = {
  id: string
  from_product_id: string
  to_product_id: string
  relation_type: string
}

export type CategoryFactEvidence = {
  product_id: string
  evidence_kind: string | null
  verification_status: string | null
}

export type CategoryFactGap = {
  code: string
  count?: number
}

export type CategoryEditorialOpportunity = {
  block: CategoryCmsBlockType
  code: string
  count?: number
}

export type CategoryFactPackage = {
  fact_package_version: typeof CATEGORY_FACT_PACKAGE_VERSION
  category_id: string
  slug: string
  name: string
  profile: CategoryCmsProfile
  fingerprint: string
  available_facts: {
    counts: {
      linked: number
      published: number
      active: number
      direct_linked: number
      direct_published: number
    }
    parent: { id: string; slug: string; name: string } | null
    children: Array<{
      id: string
      slug: string
      name: string
      profile: CategoryCmsProfile
      published_count: number
    }>
    related_categories: Array<{ id: string; slug: string; name: string; profile: CategoryCmsProfile }>
    published_products: Array<{
      id: string
      title: string
      brand_id: string | null
      lifecycle_status: string
    }>
    brands: Array<{
      id: string
      name: string | null
      has_logo: boolean
      logo_url: string | null
      owner_company_country: string | null
    }>
    production_countries: Array<{
      raw: string
      iso_code: string | null
      eu_market: boolean
      product_count: number
      verified_count: number
    }>
    origins: Array<{
      product_id: string
      production_country: string | null
      iso_code: string | null
      primary_assembly_country: string | null
      status: string | null
      facility_id: string | null
      facility_country: string | null
      made_in_europe: boolean
      evidence_approved: boolean
    }>
    specification_summary: {
      definition_count: number
      filterable_count: number
      comparable_count: number
      filled_value_count: number
      products_with_values: number
    }
    definitions: Array<{
      id: string
      code: string | null
      name: string
      is_filterable: boolean
      is_comparable: boolean
      requirement_tier: string | null
    }>
    value_distribution: Array<{
      definition_id: string
      code: string | null
      name: string
      value: string
      product_count: number
    }>
    relations: Array<{
      id: string
      relation_type: string
      from_product_id: string
      to_product_id: string
    }>
  }
  missing_data: CategoryFactGap[]
  derived_insights: {
    eu_market_production_product_count: number
    made_in_europe_score_count: number
    made_in_europe_with_approved_evidence_count: number
    products_with_specification_values: number
    specification_value_coverage: number
    brands_with_logo: number
  }
  editorial_opportunities: CategoryEditorialOpportunity[]
}

type Indexed = {
  byId: Map<string, CategoryFactCategory & { slug: string; profile: CategoryCmsProfile; depth: number }>
  children: Map<string, string[]>
  subtree: (id: string) => string[]
  products: Map<string, CategoryFactProduct>
  publishedVersion: Map<string, CategoryFactVersion>
  linksByCategory: Map<string, Set<string>>
  brands: Map<string, CategoryFactBrand>
  originByVersion: Map<string, CategoryFactOrigin>
  facilities: Map<string, CategoryFactFacility>
  definitionsByCategory: Map<string, CategoryFactDefinition[]>
  valuesByVersion: Map<string, CategoryFactValue[]>
  relations: CategoryFactRelation[]
  evidenceByProduct: Map<string, CategoryFactEvidence[]>
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isoCountry(raw: string | null | undefined): string | null {
  const code = text(raw).toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

function profileOf(depth: number): CategoryCmsProfile | null {
  if (depth === 1) return "level_1"
  if (depth === 2) return "level_2"
  if (depth === 3) return "level_3"
  return null
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) out[key] = canonicalize(source[key])
    return out
  }
  return value ?? null
}

export function categoryFactFingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex")
}

function depthOf(
  id: string,
  parentOf: Map<string, string | null>,
  known: Set<string>
): number | null {
  let depth = 1
  let parent = parentOf.get(id) ?? null
  const seen = new Set<string>([id])
  while (parent) {
    if (seen.has(parent) || !known.has(parent)) return null
    seen.add(parent)
    depth += 1
    if (depth > 3) return null
    parent = parentOf.get(parent) ?? null
  }
  return depth
}

function indexSource(source: CategoryFactSource): Indexed {
  const known = new Set(source.categories.map((category) => category.id))
  const parentOf = new Map(source.categories.map((category) => [category.id, category.parent_id]))
  const byId = new Map<Indexed["byId"] extends Map<string, infer V> ? V : never>()
  const children = new Map<string, string[]>()
  for (const category of source.categories) {
    const slug = text(category.slug)
    const depth = depthOf(category.id, parentOf, known)
    const profile = depth == null ? null : profileOf(depth)
    if (!slug || !profile || !depth) continue
    if (categoryCmsListExclusion({ name: category.name, slug })) continue
    byId.set(category.id, { ...category, slug, profile, depth })
    if (category.parent_id) {
      const list = children.get(category.parent_id) ?? []
      list.push(category.id)
      children.set(category.parent_id, list)
    }
  }

  const subtreeCache = new Map<string, string[]>()
  function subtree(id: string, stack = new Set<string>()): string[] {
    const cached = subtreeCache.get(id)
    if (cached) return cached
    if (stack.has(id)) return []
    stack.add(id)
    const ids = [id]
    for (const child of children.get(id) ?? []) ids.push(...subtree(child, stack))
    stack.delete(id)
    subtreeCache.set(id, ids)
    return ids
  }

  const publishedVersion = new Map<string, CategoryFactVersion>()
  for (const version of source.versions) {
    if (version.publication_status !== "Gepubliceerd") continue
    const current = publishedVersion.get(version.product_id)
    if (!current || Number(version.version_number) > Number(current.version_number)) {
      publishedVersion.set(version.product_id, version)
    }
  }

  const linksByCategory = new Map<string, Set<string>>()
  for (const link of source.links) {
    const set = linksByCategory.get(link.category_id) ?? new Set<string>()
    set.add(link.product_id)
    linksByCategory.set(link.category_id, set)
  }

  const definitionsByCategory = new Map<string, CategoryFactDefinition[]>()
  for (const definition of source.definitions) {
    if (!definition.is_active) continue
    const list = definitionsByCategory.get(definition.category_id) ?? []
    list.push(definition)
    definitionsByCategory.set(definition.category_id, list)
  }

  const valuesByVersion = new Map<string, CategoryFactValue[]>()
  for (const value of source.values) {
    if (!text(value.value)) continue
    const list = valuesByVersion.get(value.product_version_id) ?? []
    list.push(value)
    valuesByVersion.set(value.product_version_id, list)
  }

  const evidenceByProduct = new Map<string, CategoryFactEvidence[]>()
  for (const row of source.evidence) {
    const list = evidenceByProduct.get(row.product_id) ?? []
    list.push(row)
    evidenceByProduct.set(row.product_id, list)
  }

  return {
    byId,
    children,
    subtree,
    products: new Map(source.products.map((product) => [product.id, product])),
    publishedVersion,
    linksByCategory,
    brands: new Map(source.brands.map((brand) => [brand.id, brand])),
    originByVersion: new Map(source.origins.map((origin) => [origin.product_version_id, origin])),
    facilities: new Map(source.facilities.map((facility) => [facility.id, facility])),
    definitionsByCategory,
    valuesByVersion,
    relations: source.relations,
    evidenceByProduct,
  }
}

function productIdsFor(index: Indexed, categoryIds: string[]): Set<string> {
  const ids = new Set<string>()
  for (const categoryId of categoryIds) {
    for (const productId of index.linksByCategory.get(categoryId) ?? []) {
      if (index.products.has(productId)) ids.add(productId)
    }
  }
  return ids
}

function evidenceApproved(rows: CategoryFactEvidence[]): boolean {
  return rows.some(
    (row) =>
      row.verification_status === "approved" &&
      (!row.evidence_kind || row.evidence_kind === "made_in_europe")
  )
}

function madeInEurope(origin: CategoryFactOrigin): boolean {
  const bands = completeMadeInEuropeBands(origin)
  if (!bands) return false
  return computeMadeInEuropeScore(bands).is_made_in_europe
}

function opportunity(
  block: CategoryCmsBlockType,
  code: string,
  count?: number
): CategoryEditorialOpportunity {
  return count == null ? { block, code } : { block, code, count }
}

function buildOne(
  category: Indexed["byId"] extends Map<string, infer V> ? V : never,
  index: Indexed
): CategoryFactPackage {
  const treeIds = index.subtree(category.id).filter((id) => index.byId.has(id))
  const rolled = productIdsFor(index, treeIds)
  const direct = productIdsFor(index, [category.id])
  const publishedIds = [...rolled].filter((id) => index.publishedVersion.has(id))
  const active = [...rolled].filter(
    (id) => index.products.get(id)?.lifecycle_status === "Actief"
  ).length

  const childRows = (index.children.get(category.id) ?? [])
    .map((id) => index.byId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.name.localeCompare(b.name, "nl") || a.slug.localeCompare(b.slug))
  const parent = category.parent_id ? index.byId.get(category.parent_id) ?? null : null
  const siblingIds = parent ? index.children.get(parent.id) ?? [] : []
  const related = siblingIds
    .filter((id) => id !== category.id)
    .map((id) => index.byId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.name.localeCompare(b.name, "nl") || a.slug.localeCompare(b.slug))

  const publishedProducts = publishedIds
    .map((id) => {
      const product = index.products.get(id)!
      const version = index.publishedVersion.get(id)!
      return {
        id,
        title: version.title ?? "",
        brand_id: product.brand_id,
        lifecycle_status: product.lifecycle_status,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, "nl") || a.id.localeCompare(b.id))

  const brandIds = [...new Set(publishedProducts.map((product) => product.brand_id).filter(Boolean))] as string[]
  const brands = brandIds
    .map((id) => {
      const brand = index.brands.get(id)
      const logo = text(brand?.logo_url)
      return {
        id,
        name: brand?.name ?? null,
        has_logo: Boolean(logo),
        logo_url: logo || null,
        owner_company_country: text(brand?.owner_company_country).toUpperCase() || null,
      }
    })
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id, "nl"))

  const origins = publishedProducts.flatMap((product) => {
    const version = index.publishedVersion.get(product.id)
    if (!version) return []
    const origin = index.originByVersion.get(version.id)
    if (!origin) return []
    const facility = origin.production_facility_id
      ? index.facilities.get(origin.production_facility_id) ?? null
      : null
    const rawCountry = text(origin.production_country)
    return [{
      product_id: product.id,
      production_country: rawCountry || null,
      iso_code: isoCountry(rawCountry),
      primary_assembly_country: isoCountry(origin.primary_assembly_country),
      status: origin.status,
      facility_id: facility?.id ?? null,
      facility_country: isoCountry(facility?.country_code),
      made_in_europe: madeInEurope(origin),
      evidence_approved: evidenceApproved(index.evidenceByProduct.get(product.id) ?? []),
    }]
  })

  const countryCounts = new Map<string, { raw: string; iso_code: string | null; eu_market: boolean; product_count: number; verified_count: number }>()
  for (const origin of origins) {
    if (!origin.production_country) continue
    const key = origin.iso_code ?? origin.production_country
    const current = countryCounts.get(key) ?? {
      raw: origin.iso_code ?? origin.production_country,
      iso_code: origin.iso_code,
      eu_market: Boolean(origin.iso_code && isEuMarketCode(origin.iso_code)),
      product_count: 0,
      verified_count: 0,
    }
    current.product_count += 1
    if (origin.status === "Geverifieerd") current.verified_count += 1
    countryCounts.set(key, current)
  }

  const definitionScope = treeIds.flatMap((id) => index.definitionsByCategory.get(id) ?? [])
  const definitionById = new Map(definitionScope.map((definition) => [definition.id, definition]))
  const distribution = new Map<string, { definition_id: string; code: string | null; name: string; value: string; product_count: number }>()
  const productsWithValues = new Set<string>()
  for (const product of publishedProducts) {
    const version = index.publishedVersion.get(product.id)
    if (!version) continue
    let filled = false
    for (const value of index.valuesByVersion.get(version.id) ?? []) {
      const definition = definitionById.get(value.attribute_definition_id)
      if (!definition) continue
      filled = true
      const key = `${definition.id}\u0000${text(value.value)}`
      const current = distribution.get(key) ?? {
        definition_id: definition.id,
        code: definition.code,
        name: definition.name,
        value: text(value.value),
        product_count: 0,
      }
      current.product_count += 1
      distribution.set(key, current)
    }
    if (filled) productsWithValues.add(product.id)
  }

  const filledDefinitionIds = new Set([...distribution.values()].map((row) => row.definition_id))
  const visibleDefinitions = (category.profile === "level_1"
    ? definitionScope.filter((definition) => filledDefinitionIds.has(definition.id))
    : definitionScope
  )
    .map((definition) => ({
      id: definition.id,
      code: definition.code,
      name: definition.name,
      is_filterable: definition.is_filterable,
      is_comparable: definition.is_comparable,
      requirement_tier: definition.requirement_tier,
    }))
    .sort((a, b) => (a.code ?? a.name).localeCompare(b.code ?? b.name, "nl") || a.id.localeCompare(b.id))

  const relations = index.relations
    .filter((relation) => rolled.has(relation.from_product_id) && rolled.has(relation.to_product_id))
    .map((relation) => ({
      id: relation.id,
      relation_type: relation.relation_type,
      from_product_id: relation.from_product_id,
      to_product_id: relation.to_product_id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const shoppingFilters = definitionScope.filter(
    (definition) => definition.is_filterable && definition.requirement_tier !== "compliance_required"
  )
  const comparable = definitionScope.filter(
    (definition) => definition.is_comparable && definition.requirement_tier !== "compliance_required"
  )
  const counts = {
    linked: rolled.size,
    published: publishedProducts.length,
    active,
    direct_linked: [...direct].filter((id) => index.products.has(id)).length,
    direct_published: [...direct].filter((id) => index.publishedVersion.has(id)).length,
  }
  const countries = [...countryCounts.values()].sort((a, b) => a.raw.localeCompare(b.raw))
  const euProducts = origins.filter((origin) => origin.iso_code && isEuMarketCode(origin.iso_code)).length
  const mie = origins.filter((origin) => origin.made_in_europe).length
  const mieEvidence = origins.filter((origin) => origin.made_in_europe && origin.evidence_approved).length
  const logos = brands.filter((brand) => brand.has_logo).length
  const coverage = counts.published === 0 ? 0 : productsWithValues.size / counts.published

  const missing: CategoryFactGap[] = [{ code: "popularity_unavailable" }]
  if (counts.published === 0) missing.push({ code: "empty_product_tree" })
  if (brands.length) missing.push({ code: "brand_country_not_in_model", count: brands.length })
  const withoutLogo = brands.length - logos
  if (withoutLogo > 0) missing.push({ code: "brands_without_logo", count: withoutLogo })
  const withoutOrigin = counts.published - origins.length
  if (withoutOrigin > 0) missing.push({ code: "products_without_origin", count: withoutOrigin })
  const nonIso = origins.filter((origin) => origin.production_country && !origin.iso_code).length
  if (nonIso > 0) missing.push({ code: "production_country_not_iso", count: nonIso })
  const emptyDefinitions = definitionScope.length - filledDefinitionIds.size
  if (emptyDefinitions > 0) {
    missing.push({ code: "definitions_without_values", count: emptyDefinitions })
  }
  if (relations.length === 0) missing.push({ code: "no_product_relations" })

  const editorial: CategoryEditorialOpportunity[] = []
  if (category.profile === "level_1") {
    editorial.push(
      opportunity("subcategory_tiles", "child_categories", childRows.length),
      opportunity("product_carousel", "published_products", counts.published),
      opportunity("product_carousel", "popularity_unavailable"),
      opportunity("brand_overview", "brands", brands.length),
      opportunity("brand_overview", "brands_with_logo", logos),
      opportunity("why_europmade", "iso_production_countries", origins.filter((origin) => origin.iso_code).length),
      opportunity("why_europmade", "eu_market_production_countries", euProducts),
      opportunity("why_europmade", "verified_origins", origins.filter((origin) => origin.status === "Geverifieerd").length)
    )
  } else if (category.profile === "level_2") {
    editorial.push(
      opportunity("product_group_tiles", "child_categories", childRows.length),
      opportunity("brand_overview", "brands", brands.length),
      opportunity("advice_compare", "comparable_definitions", comparable.length),
      opportunity("choice_assistant_cta", "comparable_definitions", comparable.length)
    )
  } else {
    editorial.push(
      opportunity("filters", "filterable_definitions", shoppingFilters.length),
      opportunity("product_grid", "published_products", counts.published),
      opportunity("product_grid", "popularity_unavailable"),
      opportunity("product_comparison", "products_with_values", productsWithValues.size),
      opportunity("buying_guide", "comparable_definitions", comparable.length),
      opportunity("related_products", "product_relations", relations.length),
      opportunity("brand_overview", "brands", brands.length)
    )
  }

  const fingerprint = categoryFactFingerprint({
    category_id: category.id,
    slug: category.slug,
    profile: category.profile,
    children: childRows.map((child) => ({ id: child.id, slug: child.slug })),
    products: [...rolled]
      .sort()
      .map((id) => {
        const product = index.products.get(id)!
        const version = index.publishedVersion.get(id)
        return {
          id,
          lifecycle_status: product.lifecycle_status,
          brand_id: product.brand_id,
          title: version?.title ?? null,
          published_version_id: version?.id ?? null,
          published_version_number: version ? Number(version.version_number) : null,
        }
      }),
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      logo_url: brand.logo_url,
      owner_company_country: brand.owner_company_country,
    })),
    origins: origins.map((origin) => ({
      product_id: origin.product_id,
      production_country: origin.production_country,
      primary_assembly_country: origin.primary_assembly_country,
      status: origin.status,
      facility_id: origin.facility_id,
      facility_country: origin.facility_country,
    })),
    definitions: definitionScope
      .map((definition) => ({
        id: definition.id,
        code: definition.code,
        is_filterable: definition.is_filterable,
        is_comparable: definition.is_comparable,
        requirement_tier: definition.requirement_tier,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    values: [...distribution.values()]
      .map((row) => ({ definition_id: row.definition_id, value: row.value, product_count: row.product_count }))
      .sort((a, b) => a.definition_id.localeCompare(b.definition_id) || a.value.localeCompare(b.value)),
    relations,
  })

  return {
    fact_package_version: CATEGORY_FACT_PACKAGE_VERSION,
    category_id: category.id,
    slug: category.slug,
    name: category.name,
    profile: category.profile,
    fingerprint,
    available_facts: {
      counts,
      parent: parent ? { id: parent.id, slug: parent.slug, name: parent.name } : null,
      children: childRows.map((child) => {
        const ids = productIdsFor(
          index,
          index.subtree(child.id).filter((id) => index.byId.has(id))
        )
        let publishedCount = 0
        for (const id of ids) if (index.publishedVersion.has(id)) publishedCount += 1
        return {
          id: child.id,
          slug: child.slug,
          name: child.name,
          profile: child.profile,
          published_count: publishedCount,
        }
      }),
      related_categories: related.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        profile: row.profile,
      })),
      published_products: publishedProducts,
      brands,
      production_countries: countries,
      origins,
      specification_summary: {
        definition_count: definitionScope.length,
        filterable_count: shoppingFilters.length,
        comparable_count: comparable.length,
        filled_value_count: distribution.size,
        products_with_values: productsWithValues.size,
      },
      definitions: visibleDefinitions,
      value_distribution: [...distribution.values()].sort(
        (a, b) => a.code?.localeCompare(b.code ?? "", "nl") || a.value.localeCompare(b.value, "nl")
      ),
      relations,
    },
    missing_data: missing,
    derived_insights: {
      eu_market_production_product_count: euProducts,
      made_in_europe_score_count: mie,
      made_in_europe_with_approved_evidence_count: mieEvidence,
      products_with_specification_values: productsWithValues.size,
      specification_value_coverage: coverage,
      brands_with_logo: logos,
    },
    editorial_opportunities: editorial,
  }
}

export function buildCategoryFactPackages(source: CategoryFactSource): CategoryFactPackage[] {
  const index = indexSource(source)
  return [...index.byId.values()]
    .map((category) => buildOne(category, index))
    .sort((a, b) => a.profile.localeCompare(b.profile) || a.slug.localeCompare(b.slug))
}

export function summarizeCategoryFactPackages(packages: CategoryFactPackage[]) {
  const profiles = ["level_1", "level_2", "level_3"] as const
  const byProfile = Object.fromEntries(
    profiles.map((profile) => {
      const rows = packages.filter((row) => row.profile === profile)
      return [profile, {
        categories: rows.length,
        with_published: rows.filter((row) => row.available_facts.counts.published > 0).length,
      }]
    })
  )
  const bySlug = new Map(packages.map((row) => [row.slug, row]))
  return {
    total: packages.length,
    by_profile: byProfile as Record<CategoryCmsProfile, { categories: number; with_published: number }>,
    empty_level_1: packages
      .filter((row) => row.profile === "level_1" && row.available_facts.counts.published === 0)
      .map((row) => row.slug)
      .sort(),
    published_by_slug: Object.fromEntries(
      ["elektronica", "sport", "wonen"].map((slug) => [
        slug,
        bySlug.get(slug)?.available_facts.counts.published ?? null,
      ])
    ),
  }
}

type ListPage = (
  filters: Record<string, unknown>,
  config: { take: number; skip: number; relations?: string[] }
) => Promise<unknown[]>

async function listAll(list: ListPage, relations?: string[]): Promise<unknown[]> {
  const take = 500
  const rows: unknown[] = []
  for (let skip = 0; ; skip += take) {
    const page = await list({}, { take, skip, ...(relations ? { relations } : {}) })
    rows.push(...page)
    if (page.length < take) break
  }
  return rows
}

function idOf(row: unknown, key: string): string {
  if (!row || typeof row !== "object") return ""
  const record = row as Record<string, unknown>
  const direct = record[key]
  if (typeof direct === "string") return direct
  const relation = record[key.replace(/_id$/, "")]
  if (typeof relation === "string") return relation
  if (relation && typeof relation === "object" && typeof (relation as { id?: unknown }).id === "string") {
    return (relation as { id: string }).id
  }
  return ""
}

export async function loadCategoryFactSource(deps: {
  listCategories: ListPage
  listProducts: ListPage
  listProductVersions: ListPage
  listProductCategories: ListPage
  listAttributeDefinitions: ListPage
  listAttributeValues: ListPage
  listProductRelations: ListPage
  listBrands: ListPage
  listProductionFacilities: ListPage
  listProductOrigins: ListPage
  listProductOriginEvidences: ListPage
}): Promise<CategoryFactSource> {
  const [
    categories,
    products,
    versions,
    links,
    definitions,
    values,
    relations,
    brands,
    facilities,
    origins,
    evidence,
  ] = await Promise.all([
    listAll(deps.listCategories, ["parent_category"]),
    listAll(deps.listProducts),
    listAll(deps.listProductVersions),
    listAll(deps.listProductCategories),
    listAll(deps.listAttributeDefinitions),
    listAll(deps.listAttributeValues),
    listAll(deps.listProductRelations),
    listAll(deps.listBrands, ["owner_company"]),
    listAll(deps.listProductionFacilities),
    listAll(deps.listProductOrigins),
    listAll(deps.listProductOriginEvidences),
  ])

  return {
    categories: categories.map((row) => {
      const record = row as { id: string; name?: string; slug?: string | null }
      return {
        id: record.id,
        name: record.name ?? "",
        slug: record.slug ?? null,
        parent_id: parentIdOf(row as Parameters<typeof parentIdOf>[0]),
      }
    }),
    products: products.map((row) => {
      const record = row as { id: string; brand_id?: string | null; lifecycle_status?: string }
      return {
        id: record.id,
        brand_id: record.brand_id ?? null,
        lifecycle_status: record.lifecycle_status ?? "",
      }
    }),
    versions: versions.map((row) => {
      const record = row as {
        id: string
        version_number?: number
        publication_status?: string
        title?: string
      }
      return {
        id: record.id,
        product_id: idOf(row, "product_id"),
        version_number: Number(record.version_number ?? 0),
        publication_status: record.publication_status ?? "",
        title: record.title ?? "",
      }
    }),
    links: links
      .map((row) => ({ product_id: idOf(row, "product_id"), category_id: idOf(row, "category_id") }))
      .filter((link) => link.product_id && link.category_id),
    brands: brands.map((row) => {
      const record = row as {
        id: string
        name?: string
        logo_url?: string | null
        owner_company?: { country_code?: string | null } | null
      }
      return {
        id: record.id,
        name: record.name ?? "",
        logo_url: record.logo_url ?? null,
        owner_company_country: record.owner_company?.country_code ?? null,
      }
    }),
    origins: origins.map((row) => {
      const record = row as CategoryFactOrigin
      return {
        product_version_id: record.product_version_id,
        production_country: record.production_country ?? null,
        primary_assembly_country: record.primary_assembly_country ?? null,
        status: record.status ?? null,
        production_facility_id: record.production_facility_id ?? null,
        assembly_eu_band: record.assembly_eu_band ?? null,
        parts_eu_level: record.parts_eu_level ?? null,
        materials_eu_level: record.materials_eu_level ?? null,
      }
    }),
    facilities: facilities.map((row) => {
      const record = row as { id: string; name?: string; country_code?: string | null }
      return { id: record.id, name: record.name ?? "", country_code: record.country_code ?? null }
    }),
    definitions: definitions.map((row) => {
      const record = row as CategoryFactDefinition
      return {
        id: record.id,
        category_id: idOf(row, "category_id"),
        code: record.code ?? null,
        name: record.name,
        is_filterable: Boolean(record.is_filterable),
        is_comparable: Boolean(record.is_comparable),
        is_active: record.is_active !== false,
        requirement_tier: record.requirement_tier ?? null,
      }
    }),
    values: values.map((row) => {
      const record = row as { value?: string }
      return {
        product_version_id: idOf(row, "product_version_id"),
        attribute_definition_id: idOf(row, "attribute_definition_id"),
        value: record.value ?? "",
      }
    }),
    relations: relations.map((row) => {
      const record = row as { id: string; relation_type?: string }
      return {
        id: record.id,
        from_product_id: idOf(row, "from_product_id"),
        to_product_id: idOf(row, "to_product_id"),
        relation_type: record.relation_type ?? "",
      }
    }),
    evidence: evidence.map((row) => {
      const record = row as { evidence_kind?: string | null; verification_status?: string | null }
      return {
        product_id: idOf(row, "product_id"),
        evidence_kind: record.evidence_kind ?? null,
        verification_status: record.verification_status ?? null,
      }
    }),
  }
}
