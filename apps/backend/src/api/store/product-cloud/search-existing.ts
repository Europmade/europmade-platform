import type { MedusaContainer } from "@medusajs/framework/types"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { buildProductCloudPreview } from "./product-preview"
import {
  gtinDigitsFromQuery,
  mergeSearchDrafts,
  ownSellerSkuMatches,
  paginateSearchHits,
  textIncludesInsensitive,
  type ExistingProductMatchKind,
  type ExistingProductSearchDraft,
  type ExistingProductSearchHit,
} from "../../../modules/product-cloud/existing-product-search"
import { isConceptDraftIdentifier } from "../../../modules/product-cloud/concept-identifier"

type IdentifierRow = {
  id: string
  product_variant_id: string
  identifier_type: string
  identifier_value: string
  country_scope?: string | null
}

type VariantRow = { id: string; product_id: string }
type VersionRow = {
  id: string
  product_id: string
  title: string
  publication_status: string
  version_number: number
}
type ProductRow = {
  id: string
  brand_id: string
  manufacturer_id: string
  lifecycle_status?: string
}
type MediaRow = {
  media_type: string
  storage_reference: string
}

function emptyDraft(
  productId: string,
  kinds: ExistingProductMatchKind[]
): ExistingProductSearchDraft {
  return {
    product_id: productId,
    title: null,
    brand_id: "",
    brand_name: null,
    ean: null,
    mpn: null,
    identifier_id: null,
    category_names: [],
    primary_image_url: null,
    own_offer: false,
    match_kinds: kinds,
  }
}

async function productIdFromIdentifier(
  productCloud: ProductCloudModuleService,
  row: IdentifierRow
): Promise<string | null> {
  try {
    const variant = (await productCloud.retrieveProductVariant(
      row.product_variant_id
    )) as VariantRow
    return variant.product_id
  } catch {
    return null
  }
}

async function listIdentifiersForProduct(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<IdentifierRow[]> {
  const variants = (await productCloud.listProductVariants({
    product_id: productId,
  })) as VariantRow[]
  const nested = await Promise.all(
    variants.map(
      (variant) =>
        productCloud.listIdentifiers({
          product_variant_id: variant.id,
        }) as Promise<IdentifierRow[]>
    )
  )
  return nested.flat()
}

async function resolveBrandName(
  partner: PartnerModuleService | null,
  brandId: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  if (!brandId) return null
  if (cache.has(brandId)) return cache.get(brandId) ?? null
  if (!partner) {
    cache.set(brandId, brandId.startsWith("brand_") ? null : brandId)
    return cache.get(brandId) ?? null
  }
  try {
    const brand = (await partner.retrieveBrand(brandId)) as { name?: string }
    const name = brand.name ?? null
    cache.set(brandId, name)
    return name
  } catch {
    const fallback = brandId.startsWith("brand_") ? null : brandId
    cache.set(brandId, fallback)
    return fallback
  }
}

async function primaryImageForProduct(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<string | null> {
  const versions = (await productCloud.listProductVersions({
    product_id: productId,
  })) as VersionRow[]
  const latest = [...versions].sort((a, b) => b.version_number - a.version_number)[0]
  if (!latest) return null
  const media = (await productCloud.listProductMedias({
    product_version_id: latest.id,
  })) as MediaRow[]
  const primary =
    media.find((row) => row.media_type === "Hoofdafbeelding") || media[0]
  return primary?.storage_reference ?? null
}

async function enrichDraft(
  productCloud: ProductCloudModuleService,
  partner: PartnerModuleService | null,
  draft: ExistingProductSearchDraft,
  brandCache: Map<string, string | null>,
  ownIdentifierIds: Set<string>
): Promise<ExistingProductSearchDraft> {
  const preview = await buildProductCloudPreview(productCloud, draft.product_id)
  const identifiers = await listIdentifiersForProduct(
    productCloud,
    draft.product_id
  )
  const gtins = identifiers.filter((row) => row.identifier_type === "GTIN")
  const mpns = identifiers.filter((row) => {
    if (row.identifier_type === "MPN") return true
    return (
      row.identifier_type !== "GTIN" &&
      row.identifier_type !== "IMPORT_REF" &&
      !isConceptDraftIdentifier(
        row.identifier_type,
        row.identifier_value,
        row.country_scope
      )
    )
  })
  const gtin =
    gtins.find((row) => row.id === preview.identifier_id) || gtins[0] || null
  const mpn = mpns[0] || null
  const identifierId =
    draft.identifier_id ||
    preview.identifier_id ||
    gtin?.id ||
    mpn?.id ||
    null
  const ownOffer =
    draft.own_offer || identifiers.some((row) => ownIdentifierIds.has(row.id))
  const brandName = await resolveBrandName(partner, preview.brand_id, brandCache)
  return {
    ...draft,
    title: draft.title || preview.title,
    brand_id: preview.brand_id,
    brand_name: brandName,
    ean:
      gtin?.identifier_value ||
      (preview.identifier_type === "GTIN" ? preview.identifier_value : null),
    mpn:
      mpn?.identifier_value ||
      (preview.identifier_type === "MPN" ? preview.identifier_value : null),
    identifier_id: identifierId,
    category_names: preview.category_names,
    primary_image_url: await primaryImageForProduct(
      productCloud,
      draft.product_id
    ),
    own_offer: ownOffer,
  }
}

export async function searchExistingProductCloudProducts(opts: {
  container: MedusaContainer
  sellerId: string
  q: string
  offset?: number
  limit?: number
}): Promise<{
  products: ExistingProductSearchHit[]
  count: number
  offset: number
  limit: number
  creates_product: false
}> {
  const productCloud = opts.container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = opts.container.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  let partner: PartnerModuleService | null = null
  try {
    partner = opts.container.resolve(PARTNER_MODULE) as PartnerModuleService
  } catch {
    partner = null
  }

  const q = opts.q
  const drafts: ExistingProductSearchDraft[] = []
  const digits = gtinDigitsFromQuery(q)
  const brandCache = new Map<string, string | null>()

  const ownOffers = commerce
    ? ((await commerce.listOffers({ seller_id: opts.sellerId })) as Array<{
        identifier_id: string
        seller_id: string
        seller_sku?: string | null
      }>)
    : []
  const ownIdentifierIds = new Set(ownOffers.map((row) => row.identifier_id))

  if (digits) {
    const gtinHits = (await productCloud.listIdentifiers(
      { identifier_value: digits, identifier_type: "GTIN" },
      { take: 50 }
    )) as IdentifierRow[]
    for (const row of gtinHits) {
      const productId = await productIdFromIdentifier(productCloud, row)
      if (!productId) continue
      drafts.push({
        ...emptyDraft(productId, ["ean"]),
        identifier_id: row.id,
        ean: row.identifier_value,
      })
    }
  }

  const identifierExact = (await productCloud.listIdentifiers(
    { identifier_value: q },
    { take: 50 }
  )) as IdentifierRow[]
  for (const row of identifierExact) {
    const productId = await productIdFromIdentifier(productCloud, row)
    if (!productId) continue
    if (row.identifier_type === "GTIN") {
      drafts.push({
        ...emptyDraft(productId, ["ean"]),
        identifier_id: row.id,
        ean: row.identifier_value,
      })
    } else if (row.identifier_type === "MPN") {
      drafts.push({
        ...emptyDraft(productId, ["mpn"]),
        identifier_id: row.id,
        mpn: row.identifier_value,
      })
    }
  }

  const mpnRows = (await productCloud.listIdentifiers(
    { identifier_type: "MPN" },
    { take: 1500 }
  )) as IdentifierRow[]
  for (const row of mpnRows) {
    if (!textIncludesInsensitive(row.identifier_value, q)) continue
    const productId = await productIdFromIdentifier(productCloud, row)
    if (!productId) continue
    drafts.push({
      ...emptyDraft(productId, ["mpn"]),
      identifier_id: row.id,
      mpn: row.identifier_value,
    })
  }

  for (const offer of ownOffers) {
    if (
      !ownSellerSkuMatches({
        query: q,
        sku: offer.seller_sku,
        offerSellerId: offer.seller_id,
        actorSellerId: opts.sellerId,
      })
    ) {
      continue
    }
    try {
      const identifier = (await productCloud.retrieveIdentifier(
        offer.identifier_id
      )) as IdentifierRow
      const productId = await productIdFromIdentifier(productCloud, identifier)
      if (!productId) continue
      drafts.push({
        ...emptyDraft(productId, ["own_sku"]),
        identifier_id: identifier.id,
        own_offer: true,
      })
    } catch {
      continue
    }
  }

  if (!digits || drafts.length === 0) {
    const versions = (await productCloud.listProductVersions(
      {},
      { order: { version_number: "DESC" }, take: 2500 }
    )) as VersionRow[]
    const seenVersionProduct = new Set<string>()
    const latestByProduct = new Map<string, VersionRow>()
    for (const version of versions) {
      if (seenVersionProduct.has(version.product_id)) continue
      seenVersionProduct.add(version.product_id)
      latestByProduct.set(version.product_id, version)
    }

    const productIds = [...latestByProduct.keys()]
    let products: ProductRow[] = []
    if (productIds.length) {
      try {
        products = (await productCloud.listProducts(
          { id: productIds },
          { take: Math.max(productIds.length, 1) }
        )) as ProductRow[]
      } catch {
        products = (await productCloud.listProducts(
          {},
          { take: 2500 }
        )) as ProductRow[]
      }
    }
    const productById = new Map(products.map((row) => [row.id, row]))

    for (const [productId, version] of latestByProduct) {
      const product = productById.get(productId)
      if (product?.lifecycle_status === "Gearchiveerd") continue
      const titleHit = textIncludesInsensitive(version.title || "", q)
      const brandName = product
        ? await resolveBrandName(partner, product.brand_id, brandCache)
        : null
      const brandHit =
        Boolean(brandName && textIncludesInsensitive(brandName, q)) ||
        Boolean(product?.brand_id && textIncludesInsensitive(product.brand_id, q))
      if (!titleHit && !brandHit) continue
      const kinds: ExistingProductMatchKind[] = []
      if (titleHit) kinds.push("title")
      if (brandHit) kinds.push("brand")
      drafts.push({
        ...emptyDraft(productId, kinds),
        title: version.title,
        brand_id: product?.brand_id || "",
        brand_name: brandName,
      })
    }
  }

  const merged = mergeSearchDrafts(drafts)
  const page = paginateSearchHits(merged, opts.offset ?? 0, opts.limit ?? 20)
  const enriched: ExistingProductSearchHit[] = []
  for (const row of page.items) {
    const filled = await enrichDraft(
      productCloud,
      partner,
      row,
      brandCache,
      ownIdentifierIds
    )
    enriched.push({
      ...filled,
      certainty: row.certainty,
      match_kinds: row.match_kinds,
    })
  }

  return {
    products: enriched,
    count: page.count,
    offset: page.offset,
    limit: page.limit,
    creates_product: false,
  }
}
