import {
  commercialCatalogCategoryParam,
  conceptPreviewSpecs,
  conceptProductBelongsInPreview,
  expandCategorySlugsWithDescendants,
  listDisplayableMediaReferences,
  persistMediaReference,
  type CategoryPreviewConceptProduct,
} from "@europmade/utils"
import { COMMERCE_CLOUD_MODULE } from "../commerce-cloud"
import type CommerceCloudModuleService from "../commerce-cloud/service"
import { parentIdOf } from "../product-cloud/category-admin"
import { PRODUCT_CLOUD_MODULE } from "../product-cloud"
import type ProductCloudModuleService from "../product-cloud/service"
import { PARTNER_MODULE } from "../partner"
import type PartnerModuleService from "../partner/service"

type Scope = { resolve: (key: string) => unknown }

type VersionRow = {
  id: string
  product_id: string
  title?: string | null
  version_number?: number | null
  publication_status?: string | null
}

type ProductRow = {
  id: string
  brand_id?: string | null
  lifecycle_status?: string | null
}

const SCAN = 4000

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size))
  }
  return out
}

/**
 * Read-only Product Cloud rows for the admin draft preview.
 * Does not approve, publish, price, or change an offer.
 */
export async function listCategoryConceptPreviewProducts(
  scope: Scope,
  slug: string
): Promise<CategoryPreviewConceptProduct[]> {
  const productCloud = scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const categories = await productCloud.listCategories(
    {},
    { take: 2000, order: { name: "ASC" }, relations: ["parent_category"] }
  )
  const nodes = categories.flatMap((category) => {
    const id = category.id?.trim()
    if (!id) return []
    return [
      {
        id,
        slug: category.slug ?? null,
        name: category.name,
        parent_category_id: parentIdOf(category),
      },
    ]
  })
  const categoryFilter = expandCategorySlugsWithDescendants(
    commercialCatalogCategoryParam(slug) ?? slug,
    nodes
  )
  const slugByCategory = new Map<string, string>()
  for (const node of nodes) {
    const categorySlug = node.slug?.trim().toLowerCase()
    if (categorySlug) slugByCategory.set(node.id, categorySlug)
  }

  const conceptVersions = (await productCloud.listProductVersions(
    { publication_status: "Concept" },
    { order: { version_number: "DESC" }, take: SCAN }
  )) as VersionRow[]
  const conceptByProduct = new Map<string, VersionRow>()
  for (const version of conceptVersions) {
    const productId = version.product_id?.trim()
    if (!productId) continue
    const current = conceptByProduct.get(productId)
    const nextNumber = Number(version.version_number ?? 0)
    const currentNumber = Number(current?.version_number ?? -1)
    if (!current || nextNumber >= currentNumber) conceptByProduct.set(productId, version)
  }
  const productIds = [...conceptByProduct.keys()]
  if (productIds.length === 0) return []

  const latestByProduct = new Map<string, VersionRow>()
  const productsById = new Map<string, ProductRow>()
  const slugsByProduct = new Map<string, string[]>()
  for (const ids of chunks(productIds, 200)) {
    const versions = (await productCloud.listProductVersions(
      { product_id: ids },
      { take: SCAN }
    )) as VersionRow[]
    for (const version of versions) {
      const current = latestByProduct.get(version.product_id)
      if (!current || Number(version.version_number ?? 0) >= Number(current.version_number ?? -1)) {
        latestByProduct.set(version.product_id, version)
      }
    }
    const products = (await productCloud.listProducts({ id: ids }, { take: ids.length })) as ProductRow[]
    for (const product of products) productsById.set(product.id, product)
    const links = (await productCloud.listProductCategories(
      { product_id: ids },
      { take: SCAN }
    )) as Array<{ product_id: string; category_id: string }>
    for (const link of links) {
      const categorySlug = slugByCategory.get(link.category_id)
      if (!categorySlug) continue
      const current = slugsByProduct.get(link.product_id) ?? []
      current.push(categorySlug)
      slugsByProduct.set(link.product_id, current)
    }
  }

  const selected: Array<{ product: ProductRow; version: VersionRow; categorySlugs: string[] }> = []
  for (const productId of productIds) {
    const product = productsById.get(productId)
    const latest = latestByProduct.get(productId) ?? conceptByProduct.get(productId)
    if (!product || !latest) continue
    if (
      !conceptProductBelongsInPreview({
        title: latest.title ?? "",
        lifecycleStatus: product.lifecycle_status ?? "",
        publicationStatus: latest.publication_status ?? "",
        categorySlugs: slugsByProduct.get(productId) ?? [],
        categoryFilter,
      })
    ) {
      continue
    }
    selected.push({
      product,
      version: latest,
      categorySlugs: slugsByProduct.get(productId) ?? [],
    })
  }
  if (selected.length === 0) return []

  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const brandNames = new Map<string, string | null>()
  async function brandName(brandId: string | null | undefined): Promise<string | null> {
    const id = brandId?.trim() || ""
    if (!id) return null
    if (brandNames.has(id)) return brandNames.get(id) ?? null
    try {
      const brand = await partner.retrieveBrand(id)
      const name = typeof brand.name === "string" ? brand.name.trim() : ""
      brandNames.set(id, name || null)
    } catch {
      brandNames.set(id, null)
    }
    return brandNames.get(id) ?? null
  }

  const versionIds = selected.map((row) => row.version.id)
  const mediaByVersion = new Map<string, string[]>()
  const specsByVersion = new Map<string, Array<{ code: string; value: string }>>()
  for (const ids of chunks(versionIds, 100)) {
    const media = (await productCloud.listProductMedias(
      { product_version_id: ids },
      { order: { sort_order: "ASC" }, take: SCAN }
    )) as Array<{ product_version_id?: string; media_type?: string; storage_reference?: string }>
    const grouped = new Map<string, typeof media>()
    for (const item of media) {
      const versionId = item.product_version_id?.trim() || ""
      if (!versionId || item.media_type === "Video") continue
      const current = grouped.get(versionId) ?? []
      current.push(item)
      grouped.set(versionId, current)
    }
    for (const [versionId, items] of grouped) {
      const refs = listDisplayableMediaReferences(items)
        .map((ref) => persistMediaReference(ref))
        .filter((ref): ref is string => Boolean(ref))
      if (refs.length > 0) mediaByVersion.set(versionId, refs)
    }
    const values = (await productCloud.listAttributeValues(
      { product_version_id: ids },
      { take: SCAN }
    )) as Array<{ product_version_id?: string; attribute_definition_id?: string; value?: string | null }>
    const definitionIds = [...new Set(values.map((row) => row.attribute_definition_id?.trim() || "").filter(Boolean))]
    const codeByDefinition = new Map<string, string>()
    if (definitionIds.length > 0) {
      const definitions = (await productCloud.listAttributeDefinitions(
        { id: definitionIds },
        { take: definitionIds.length }
      )) as Array<{ id: string; code?: string | null }>
      for (const definition of definitions) {
        const code = definition.code?.trim() || ""
        if (code) codeByDefinition.set(definition.id, code)
      }
    }
    for (const row of values) {
      const versionId = row.product_version_id?.trim() || ""
      const code = codeByDefinition.get(row.attribute_definition_id?.trim() || "") || ""
      if (!versionId || !code) continue
      const current = specsByVersion.get(versionId) ?? []
      current.push({ code, value: row.value?.trim() || "" })
      specsByVersion.set(versionId, current)
    }
  }

  const priceByProduct = await readStoredPrices(scope, selected.map((row) => row.product.id))
  const products: CategoryPreviewConceptProduct[] = []
  for (const row of selected) {
    const title = row.version.title?.trim() || ""
    if (!title) continue
    const images = mediaByVersion.get(row.version.id) ?? []
    products.push({
      id: row.product.id,
      title,
      brand_name: await brandName(row.product.brand_id),
      image_url: images[0] ?? null,
      image_urls: images.slice(1, 5),
      category_slugs: row.categorySlugs,
      from_price: priceByProduct.get(row.product.id) ?? null,
      attributes: conceptPreviewSpecs(specsByVersion.get(row.version.id) ?? []),
      publication_status: "Concept",
    })
  }
  products.sort((a, b) => a.title.localeCompare(b.title, "nl"))
  return products
}

async function readStoredPrices(scope: Scope, productIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  try {
    const productCloud = scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
    const commerce = scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
    const variantToProduct = new Map<string, string>()
    for (const ids of chunks(productIds, 200)) {
      const variants = (await productCloud.listProductVariants(
        { product_id: ids },
        { take: SCAN }
      )) as Array<{ id: string; product_id: string }>
      for (const variant of variants) variantToProduct.set(variant.id, variant.product_id)
    }
    const variantIds = [...variantToProduct.keys()]
    const identifierToProduct = new Map<string, string>()
    for (const ids of chunks(variantIds, 200)) {
      const identifiers = (await productCloud.listIdentifiers(
        { product_variant_id: ids },
        { take: SCAN }
      )) as Array<{ id: string; product_variant_id: string }>
      for (const identifier of identifiers) {
        const productId = variantToProduct.get(identifier.product_variant_id)
        if (productId) identifierToProduct.set(identifier.id, productId)
      }
    }
    const identifierIds = [...identifierToProduct.keys()]
    const offerToProduct = new Map<string, string>()
    for (const ids of chunks(identifierIds, 200)) {
      const offers = (await commerce.listOffers({ identifier_id: ids }, { take: SCAN })) as Array<{
        id: string
        identifier_id: string
      }>
      for (const offer of offers) {
        const productId = identifierToProduct.get(offer.identifier_id)
        if (productId) offerToProduct.set(offer.id, productId)
      }
    }
    const offerIds = [...offerToProduct.keys()]
    for (const ids of chunks(offerIds, 200)) {
      const rows = (await commerce.listOfferPrices({ offer_id: ids }, { take: SCAN })) as Array<{
        offer_id: string
        base_price?: unknown
      }>
      for (const row of rows) {
        const amount = asNumber(row.base_price)
        const productId = offerToProduct.get(row.offer_id)
        if (!productId || amount == null || amount <= 0) continue
        const current = prices.get(productId)
        if (current == null || amount < current) prices.set(productId, amount)
      }
    }
  } catch {
    return prices
  }
  return prices
}
