import {
  isTestCatalogEnabled,
  isTestCatalogGtin,
  persistMediaReference,
  listDisplayableMediaReferences,
  pickDisplayableMediaReference,
  testCatalogProductInCategory,
  testCatalogRowAllowed,
  TEST_CATALOG_GTINS,
} from "@europmade/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { formatSpecDisplayValue } from "../../../modules/product-cloud/product-specifications"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import {
  ensureTestCatalogDemoOffers,
  type TestCatalogDemoOffer,
} from "./test-catalog-demo-offers"

type VersionRow = {
  id: string
  product_id: string
  title?: string | null
  description?: string | null
  version_number?: number | null
  publication_status?: string | null
}

type ProductRow = {
  id: string
  brand_id?: string | null
  current_owner_seller_id?: string | null
  lifecycle_status?: string | null
}

export type TestCatalogListItem = {
  id: string
  title: string
  brand_name: string | null
  brand_id: string | null
  brand_slug: string | null
  brand_logo_url: string | null
  image_url: string | null
  gallery_urls: string[]
  category_slugs: string[]
  category_names: string[]
  specs: Array<{ code: string; value: string }>
  gtin: string
  offer_count: number
  from_price: number | null
  offer_id: string | null
  seller_id: string | null
  seller_name: string | null
}

type LoadedProduct = TestCatalogListItem & {
  description: string
  identifier_type: "GTIN"
  identifier_value: string
  attributes: Array<{
    code: string | null
    name: string
    value: string
    unit: string | null
    sort_order: number
  }>
  media: Array<{
    id: string
    media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
    storage_reference: string | null
    sort_order: number
    metadata: Record<string, unknown> | null
    embed_url: string | null
    video_provider: string | null
  }>
  demo_offer: TestCatalogDemoOffer | null
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch {
    return null
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size))
  }
  return out
}

/**
 * Lijst van de vaste testproducten.
 * Schrijft geen publicatiestatus of categorie. In de testmodus zorgt de lader
 * voor een vaste demo-aanbieding per product.
 */
export async function listTestCatalogProducts(
  scope: MedusaContainer,
  category?: string
): Promise<TestCatalogListItem[]> {
  if (!isTestCatalogEnabled()) return []
  const loaded = await loadTestCatalogProducts(scope)
  const filter = category?.trim() ?? ""
  const rows = filter
    ? loaded.filter((product) => testCatalogProductInCategory(product.category_slugs, filter))
    : loaded
  return rows.map((product) => ({
    id: product.id,
    title: product.title,
    brand_name: product.brand_name,
    brand_id: product.brand_id,
    brand_slug: product.brand_slug,
    brand_logo_url: product.brand_logo_url,
    image_url: product.image_url,
    gallery_urls: product.gallery_urls,
    category_slugs: product.category_slugs,
    category_names: product.category_names,
    specs: product.specs,
    gtin: product.gtin,
    offer_count: product.offer_count,
    from_price: product.from_price,
    offer_id: product.offer_id,
    seller_id: product.seller_id,
    seller_name: product.seller_name,
  }))
}

/**
 * Categoriekoppelingen van de testcatalogus, zonder media of specificaties.
 * Alleen terwijl de testcatalogus aan staat. Telt niet als publicatie of aanbieding.
 */
export async function listTestCatalogCategoryLinks(
  scope: MedusaContainer
): Promise<Array<{ product_id: string; category_id: string }>> {
  if (!isTestCatalogEnabled()) return []
  const productCloud = scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const commerce = scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  const selected: Array<{ product: ProductRow }> = []
  for (const group of chunks([...TEST_CATALOG_GTINS], 6)) {
    const rows = await Promise.all(group.map((gtin) => readCandidate(productCloud, commerce, gtin)))
    for (const row of rows) {
      if (row) selected.push(row)
    }
  }
  const unique = new Map<string, { product: ProductRow }>()
  for (const row of selected) unique.set(row.product.id, row)
  const links: Array<{ product_id: string; category_id: string }> = []
  for (const row of unique.values()) {
    const rows = (await productCloud.listProductCategories(
      { product_id: row.product.id },
      { take: 50 }
    )) as Array<{ category_id?: string }>
    for (const link of rows) {
      const categoryId = link.category_id?.trim() || ""
      if (categoryId) links.push({ product_id: row.product.id, category_id: categoryId })
    }
  }
  return links
}

/** PDP-payload voor één allowlisted product. Null houdt de bestaande niet-gepubliceerde stub. */
export async function loadTestCatalogProductDetail(
  scope: MedusaContainer,
  productId: string
): Promise<LoadedProduct | null> {
  if (!isTestCatalogEnabled()) return null
  const loaded = await loadTestCatalogProducts(scope)
  return loaded.find((product) => product.id === productId) ?? null
}

async function loadTestCatalogProducts(scope: MedusaContainer): Promise<LoadedProduct[]> {
  const productCloud = scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const commerce = scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const categories = (await productCloud.listCategories({}, { take: 2000 })) as Array<{
    id: string
    slug?: string | null
    name?: string | null
  }>
  const categoryById = new Map(categories.map((category) => [category.id, category]))

  const selected: Array<{
    product: ProductRow
    version: VersionRow
    gtin: string
    identifierId: string
  }> = []
  for (const group of chunks([...TEST_CATALOG_GTINS], 6)) {
    const rows = await Promise.all(group.map((gtin) => readCandidate(productCloud, commerce, gtin)))
    for (const row of rows) {
      if (row) selected.push(row)
    }
  }
  const unique = new Map<string, (typeof selected)[number]>()
  for (const row of selected) unique.set(row.product.id, row)
  if (unique.size === 0) return []

  const versionIds = [...unique.values()].map((row) => row.version.id)
  const mediaByVersion = new Map<string, LoadedProduct["media"]>()
  const specsByVersion = new Map<string, LoadedProduct["attributes"]>()
  for (const ids of chunks(versionIds, 50)) {
    const media = (await productCloud.listProductMedias(
      { product_version_id: ids },
      { order: { sort_order: "ASC" }, take: 1000 }
    )) as Array<{
      id: string
      product_version_id?: string
      media_type?: string
      storage_reference?: string | null
      sort_order?: number | null
      metadata?: Record<string, unknown> | null
    }>
    for (const item of media) {
      const versionId = item.product_version_id?.trim() || ""
      if (!versionId) continue
      const ref = persistMediaReference(item.storage_reference?.trim())
      const mediaType = item.media_type === "Hoofdafbeelding" || item.media_type === "Video"
        ? item.media_type
        : "Overige afbeelding"
      const metadata = plainRecord(item.metadata)
      const videoMeta = metadata?.video as { embed_url?: string; provider?: string } | undefined
      const current = mediaByVersion.get(versionId) ?? []
      current.push({
        id: item.id,
        media_type: mediaType,
        storage_reference: ref,
        sort_order: Number(item.sort_order ?? 0),
        metadata,
        embed_url: mediaType === "Video" ? videoMeta?.embed_url ?? ref : null,
        video_provider: mediaType === "Video" ? videoMeta?.provider ?? null : null,
      })
      mediaByVersion.set(versionId, current)
    }

    const values = (await productCloud.listAttributeValues(
      { product_version_id: ids },
      { take: 2000 }
    )) as Array<{
      product_version_id?: string
      attribute_definition_id?: string
      value?: string | null
    }>
    const definitionIds = [
      ...new Set(values.map((row) => row.attribute_definition_id?.trim() || "").filter(Boolean)),
    ]
    const definitionById = new Map<
      string,
      { code?: string | null; name?: string | null; unit?: string | null; sort_order?: number | null }
    >()
    if (definitionIds.length > 0) {
      const definitions = (await productCloud.listAttributeDefinitions(
        { id: definitionIds },
        { take: definitionIds.length }
      )) as Array<{
        id: string
        code?: string | null
        name?: string | null
        unit?: string | null
        sort_order?: number | null
      }>
      for (const definition of definitions) definitionById.set(definition.id, definition)
    }
    for (const row of values) {
      const versionId = row.product_version_id?.trim() || ""
      const definition = definitionById.get(row.attribute_definition_id?.trim() || "")
      const code = definition?.code?.trim() || ""
      const value = formatSpecDisplayValue(
        { unit: definition?.unit ?? undefined },
        String(row.value || "").trim()
      )
      if (!versionId || !code || !value) continue
      const current = specsByVersion.get(versionId) ?? []
      current.push({
        code,
        name: definition?.name?.trim() || code,
        value,
        unit: definition?.unit ?? null,
        sort_order: Number(definition?.sort_order ?? 0),
      })
      specsByVersion.set(versionId, current)
    }
  }

  const brands = new Map<string, { name: string | null; slug: string | null; logo_url: string | null }>()
  async function brandOf(brandId: string | null | undefined) {
    const id = brandId?.trim() || ""
    if (!id) return { name: null, slug: null, logo_url: null }
    const cached = brands.get(id)
    if (cached) return cached
    try {
      const brand = await partner.retrieveBrand(id)
      const next = {
        name: typeof brand.name === "string" && brand.name.trim() ? brand.name.trim() : null,
        slug: typeof brand.slug === "string" && brand.slug.trim() ? brand.slug.trim() : null,
        logo_url:
          typeof brand.logo_url === "string" && brand.logo_url.trim() ? brand.logo_url.trim() : null,
      }
      brands.set(id, next)
      return next
    } catch {
      const empty = { name: null, slug: null, logo_url: null }
      brands.set(id, empty)
      return empty
    }
  }

  const products: LoadedProduct[] = []
  for (const row of unique.values()) {
    const links = (await productCloud.listProductCategories(
      { product_id: row.product.id },
      { take: 50 }
    )) as Array<{ category_id: string }>
    const slugs: string[] = []
    const names: string[] = []
    for (const link of links) {
      const category = categoryById.get(link.category_id)
      const slug = category?.slug?.trim().toLowerCase() || ""
      const name = category?.name?.trim() || ""
      if (slug) slugs.push(slug)
      if (name) names.push(name)
    }
    const title = row.version.title?.trim() || ""
    if (!title) continue
    const brand = await brandOf(row.product.brand_id)
    const media = mediaByVersion.get(row.version.id) ?? []
    const primary = pickDisplayableMediaReference(media)
    const attributes = (specsByVersion.get(row.version.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "nl")
    )
    products.push({
      id: row.product.id,
      title,
      description: row.version.description?.trim() || "",
      brand_name: brand.name,
      brand_id: row.product.brand_id?.trim() || null,
      brand_slug: brand.slug,
      brand_logo_url: brand.logo_url,
      image_url: primary,
      gallery_urls: listDisplayableMediaReferences(media).filter((url) => url !== primary).slice(0, 4),
      category_slugs: slugs,
      category_names: names,
      specs: attributes.map((attribute) => ({ code: attribute.code || "", value: attribute.value })),
      gtin: row.gtin,
      offer_count: 0,
      from_price: null,
      offer_id: null,
      seller_id: null,
      seller_name: null,
      identifier_type: "GTIN",
      identifier_value: row.gtin,
      attributes,
      media,
      demo_offer: null,
    })
  }
  const offers = await ensureTestCatalogDemoOffers(
    scope,
    products.flatMap((product) => {
      const source = [...unique.values()].find((row) => row.product.id === product.id)
      const identifierId = source?.identifierId.trim() || ""
      if (!identifierId) return []
      return [
        {
          productId: product.id,
          identifierId,
          categorySlugs: product.category_slugs,
        },
      ]
    })
  )
  for (const product of products) {
    const offer = offers.get(product.id)
    if (!offer) continue
    product.demo_offer = offer
    product.offer_id = offer.offer_id
    product.seller_id = offer.seller_id
    product.seller_name = offer.seller_name
    product.offer_count = 1
    product.from_price = offer.total_price
  }
  products.sort((a, b) => a.title.localeCompare(b.title, "nl"))
  return products
}

async function readCandidate(
  productCloud: ProductCloudModuleService,
  commerce: CommerceCloudModuleService,
  gtin: string
): Promise<{ product: ProductRow; version: VersionRow; gtin: string; identifierId: string } | null> {
  if (!isTestCatalogGtin(gtin)) return null
  try {
    const identifiers = (await productCloud.listIdentifiers({
      identifier_value: gtin,
      identifier_type: "GTIN",
    })) as Array<{ id: string; product_variant_id: string }>
    const identifier = identifiers[0]
    if (!identifier) return null
    const variant = (await productCloud.retrieveProductVariant(identifier.product_variant_id)) as {
      product_id?: string
    }
    const productId = variant.product_id?.trim() || ""
    if (!productId) return null
    const product = (await productCloud.retrieveProduct(productId)) as ProductRow
    const versions = (await productCloud.listProductVersions(
      { product_id: productId },
      { take: 20 }
    )) as VersionRow[]
    const latest = [...versions].sort(
      (a, b) => Number(b.version_number ?? 0) - Number(a.version_number ?? 0)
    )[0]
    if (!latest) return null
    const offers = (await commerce.listOffers(
      { identifier_id: identifier.id },
      { take: 5 }
    )) as unknown[]
    if (
      !testCatalogRowAllowed({
        gtin,
        sellerId: product.current_owner_seller_id ?? "",
        lifecycleStatus: product.lifecycle_status ?? "",
        publicationStatus: latest.publication_status ?? "",
        offerCount: offers.length,
      })
    ) {
      return null
    }
    return { product, version: latest, gtin, identifierId: identifier.id }
  } catch {
    return null
  }
}
