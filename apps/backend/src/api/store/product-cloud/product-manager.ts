/**
 * Seller Product Manager enrichment — Product Cloud + Commerce Cloud join.
 * Catalog vs Offer stay separate; this only assembles a read model.
 */
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import type PartnerModuleService from "../../../modules/partner/service"
import {
  computeProductCompleteness,
  type CompletenessReport,
} from "../../../modules/product-cloud/completeness"
import {
  categoryRequiresCeMarking,
  slugifyCategoryName,
  type RequirementTier,
} from "../../../modules/product-cloud/category-attributes"
import { applyGpsrComplianceAttributes } from "../../../modules/product-cloud/gpsr-manufacturer"
import type { ManufacturerGpsrSource } from "../../../modules/product-cloud/gpsr-manufacturer"
import { resolveCatalogGtinValue } from "../../../modules/product-cloud/concept-identifier"
import { resolveEffectiveManufacturerId } from "../../../modules/product-cloud/manufacturer-completeness"
import { buildDocumentInputs, evidenceKindOf, type EvidenceRow } from "../../../modules/product-cloud/compliance-gates"
import type VerificationModuleService from "../../../modules/verification/service"
import { VERIFICATION_MODULE } from "../../../modules/verification"
import { buildProductCloudPreview } from "./product-preview"
import { loadMadeInEuropeForProduct } from "./made-in-europe-helpers"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  resolveProductActions,
  resolveWorkflowStatus,
} from "../../../modules/product-cloud/workflow-status"

export { resolveProductActions, resolveWorkflowStatus }

type VersionRow = {
  id: string
  product_id: string
  version_number: number
  title: string
  description: string
  publication_status: string
  created_by_seller_id: string
  approval_requested_at?: Date | string | null
  approval_rejection_reason?: string | null
  approval_decided_at?: Date | string | null
  approval_decided_by?: string | null
}

type MediaRow = {
  id: string
  product_version_id: string
  media_type: string
  storage_reference: string
}

type AttrDefRow = {
  id: string
  category_id: string
  name: string
  code: string | null
  is_required: boolean
  requirement_tier?: RequirementTier | null
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
}

type OfferEntity = {
  id: string
  seller_id: string
  identifier_id: string
  region_code: string
  seller_sku?: string | null
  sales_status?: string | null
  delivery_days_max?: number | null
}

function pickWorkingVersion(versions: VersionRow[]): VersionRow | null {
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

function moneyNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (value && typeof value === "object" && "numeric" in value) {
    const n = Number((value as { numeric: string }).numeric)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export type SellerOfferSummary = {
  offer_id: string | null
  identifier_id: string | null
  price: number | null
  shipping_cost: number | null
  stock: number | null
  region_code: string | null
  seller_sku: string | null
  sales_status: "active" | "paused" | null
  delivery_days_max: number | null
  is_sellable: boolean
  has_offer: boolean
}

/**
 * Aggregated offer view for list rows.
 * stock_total = sum of quantity_available across seller offers on this product.
 * sku_display = single SKU, or "Meerdere" when >1 distinct SKUs, or null.
 */
export type SellerOffersAggregate = {
  offer_count: number
  sku_display: string | null
  stock_total: number | null
  price: number | null
  sales_status: "active" | "paused" | "mixed" | null
  is_sellable: boolean
  delivery_days_max: number | null
  primary_offer_id: string | null
}

export type SellerProductManagerRow = {
  id: string
  brand_id: string
  brand_name: string | null
  manufacturer_id: string
  lifecycle_status: string
  current_owner_seller_id: string
  title: string | null
  description: string | null
  category_names: string[]
  primary_image_url: string | null
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
  mpn_value: string | null
  publication_status: string | null
  version_id: string | null
  variant_count: number
  regular_customer_price: number | null
  offer: SellerOfferSummary
  offers: SellerOffersAggregate
  completeness: CompletenessReport
  /** @deprecated use offer.seller_sku / offers.sku_display */
  sku_hint: string | null
  shipping_profile_id: string | null
  shipping_profile: {
    id: string
    name: string
    status: string
    active_country_count: number
    min_shipping_cost: number | null
  } | null
  actions: ReturnType<typeof resolveProductActions>
}

export type OfferLookupMaps = {
  byIdentifier: Map<string, OfferEntity[]>
  priceByOffer: Map<
    string,
    {
      base_price: unknown
      shipping_cost: unknown
    }
  >
  stockByOffer: Map<string, number>
}

export async function loadSellerOfferLookup(
  commerce: CommerceCloudModuleService | null,
  sellerId: string
): Promise<OfferLookupMaps> {
  const empty: OfferLookupMaps = {
    byIdentifier: new Map(),
    priceByOffer: new Map(),
    stockByOffer: new Map(),
  }
  if (!commerce) return empty

  const offers = (await commerce.listOffers({
    seller_id: sellerId,
  })) as OfferEntity[]

  const byIdentifier = new Map<string, OfferEntity[]>()
  for (const offer of offers) {
    const list = byIdentifier.get(offer.identifier_id) || []
    list.push(offer)
    byIdentifier.set(offer.identifier_id, list)
  }

  const priceByOffer = new Map<
    string,
    {
      base_price: unknown
      shipping_cost: unknown
    }
  >()
  const stockByOffer = new Map<string, number>()

  for (const offer of offers) {
    const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
    const [inv] = await commerce.listOfferInventories({ offer_id: offer.id })
    if (price) {
      priceByOffer.set(offer.id, {
        base_price: price.base_price,
        shipping_cost: price.shipping_cost,
      })
    }
    if (inv) {
      stockByOffer.set(offer.id, Number(inv.quantity_available))
    }
  }

  return { byIdentifier, priceByOffer, stockByOffer }
}

function summarizeOffer(
  offer: OfferEntity,
  maps: OfferLookupMaps
): SellerOfferSummary {
  const priceRow = maps.priceByOffer.get(offer.id)
  const stock = maps.stockByOffer.has(offer.id)
    ? maps.stockByOffer.get(offer.id)!
    : null
  const sales_status =
    (offer.sales_status as "active" | "paused" | null) ?? "active"
  const base = moneyNumber(priceRow?.base_price)
  const shipping = moneyNumber(priceRow?.shipping_cost)
  return {
    offer_id: offer.id,
    identifier_id: offer.identifier_id,
    price: base,
    shipping_cost: shipping,
    stock,
    region_code: offer.region_code ?? null,
    seller_sku: offer.seller_sku != null ? String(offer.seller_sku) : null,
    sales_status,
    delivery_days_max:
      offer.delivery_days_max != null ? Number(offer.delivery_days_max) : null,
    is_sellable: sales_status === "active" && (stock ?? 0) > 0,
    has_offer: true,
  }
}

function emptyOffer(identifierId: string | null): SellerOfferSummary {
  return {
    offer_id: null,
    identifier_id: identifierId,
    price: null,
    shipping_cost: null,
    stock: null,
    region_code: null,
    seller_sku: null,
    sales_status: null,
    delivery_days_max: null,
    is_sellable: false,
    has_offer: false,
  }
}

function aggregateOffers(
  summaries: SellerOfferSummary[]
): SellerOffersAggregate {
  const withOffer = summaries.filter((s) => s.has_offer)
  if (withOffer.length === 0) {
    return {
      offer_count: 0,
      sku_display: null,
      stock_total: null,
      price: null,
      sales_status: null,
      is_sellable: false,
      delivery_days_max: null,
      primary_offer_id: null,
    }
  }

  const skus = [
    ...new Set(
      withOffer
        .map((s) => s.seller_sku)
        .filter((s): s is string => typeof s === "string" && s.length > 0)
    ),
  ]
  const statuses = new Set(
    withOffer.map((s) => s.sales_status).filter(Boolean) as Array<
      "active" | "paused"
    >
  )
  let sales_status: SellerOffersAggregate["sales_status"] = null
  if (statuses.size === 1) {
    sales_status = [...statuses][0]
  } else if (statuses.size > 1) {
    sales_status = "mixed"
  }

  const stocks = withOffer
    .map((s) => s.stock)
    .filter((n): n is number => typeof n === "number")
  const prices = withOffer
    .map((s) => s.price)
    .filter((n): n is number => typeof n === "number")
  const deliveries = withOffer
    .map((s) => s.delivery_days_max)
    .filter((n): n is number => typeof n === "number")

  // Prefer an active sellable offer as primary; else first offer.
  const primary =
    withOffer.find((s) => s.is_sellable) ||
    withOffer.find((s) => s.sales_status === "active") ||
    withOffer[0]

  return {
    offer_count: withOffer.length,
    sku_display:
      skus.length === 0 ? null : skus.length === 1 ? skus[0] : "Meerdere",
    stock_total: stocks.length ? stocks.reduce((a, b) => a + b, 0) : null,
    price: prices.length ? Math.min(...prices) : null,
    sales_status,
    is_sellable: withOffer.some((s) => s.is_sellable),
    delivery_days_max: deliveries.length ? Math.min(...deliveries) : null,
    primary_offer_id: primary.offer_id,
  }
}

async function loadOffersForIdentifier(
  commerce: CommerceCloudModuleService | null,
  sellerId: string,
  identifierId: string | null,
  maps?: OfferLookupMaps | null
): Promise<SellerOfferSummary[]> {
  if (!identifierId) return []
  if (maps) {
    const list = maps.byIdentifier.get(identifierId) || []
    return list.map((o) => summarizeOffer(o, maps))
  }
  if (!commerce) return []
  const localMaps = await loadSellerOfferLookup(commerce, sellerId)
  const list = localMaps.byIdentifier.get(identifierId) || []
  return list.map((o) => summarizeOffer(o, localMaps))
}

async function loadOfferForIdentifier(
  commerce: CommerceCloudModuleService | null,
  sellerId: string,
  identifierId: string | null,
  maps?: OfferLookupMaps | null
): Promise<SellerOfferSummary> {
  const all = await loadOffersForIdentifier(
    commerce,
    sellerId,
    identifierId,
    maps
  )
  if (all.length === 0) return emptyOffer(identifierId)
  const nl = all.find((o) => (o.region_code || "").toUpperCase() === "NL")
  const active = all.find((o) => o.sales_status === "active")
  return nl || active || all[0]
}

async function resolveManufacturerProfile(
  partner: PartnerModuleService | null,
  manufacturerId: string | null | undefined
): Promise<ManufacturerGpsrSource | null> {
  if (!partner || !manufacturerId) return null
  try {
    return (await partner.retrieveManufacturer(manufacturerId)) as ManufacturerGpsrSource & {
      id: string
    }
  } catch {
    return null
  }
}

async function resolveManufacturerForCompleteness(
  partner: PartnerModuleService | null,
  manufacturerId: string | null | undefined,
  container?: MedusaContainer | null,
  productId?: string
): Promise<ManufacturerGpsrSource | null> {
  const fromManufacturer = await resolveManufacturerProfile(partner, manufacturerId)
  const hasGpsrCore = Boolean(
    fromManufacturer?.name?.trim() &&
      fromManufacturer?.country_code?.trim() &&
      fromManufacturer?.contact_email?.trim()
  )
  if (hasGpsrCore) return fromManufacturer

  if (container && productId) {
    try {
      const mie = await loadMadeInEuropeForProduct(container, productId)
      const facility = mie?.facility as {
        name?: string
        street?: string | null
        house_number?: string | null
        postal_code?: string | null
        city?: string | null
        country_code?: string | null
      } | null
      if (facility?.name && facility.country_code) {
        return {
          name: fromManufacturer?.name?.trim() || facility.name,
          street: fromManufacturer?.street ?? facility.street ?? null,
          house_number:
            fromManufacturer?.house_number ?? facility.house_number ?? null,
          postal_code: fromManufacturer?.postal_code ?? facility.postal_code ?? null,
          city: fromManufacturer?.city ?? facility.city ?? null,
          country_code:
            fromManufacturer?.country_code ?? facility.country_code ?? null,
          contact_email: fromManufacturer?.contact_email ?? null,
        }
      }
    } catch {
      /* optional enrichment */
    }
  }

  return fromManufacturer
}

async function resolveBrandName(
  partner: PartnerModuleService | null,
  brandId: string
): Promise<string | null> {
  if (!brandId) return null
  if (!partner) {
    return brandId.startsWith("brand_") ? null : brandId
  }
  try {
    const brand = await partner.retrieveBrand(brandId)
    return (brand as { name?: string }).name ?? null
  } catch {
    if (brandId.startsWith("brand_") || brandId.startsWith("brand")) return null
    return brandId
  }
}

export async function buildSellerProductManagerRow(
  productCloud: ProductCloudModuleService,
  commerce: CommerceCloudModuleService | null,
  product: {
    id: string
    brand_id: string
    manufacturer_id: string
    lifecycle_status: string
    current_owner_seller_id: string
  },
  sellerId: string,
  opts?: {
    offerMaps?: OfferLookupMaps | null
    partner?: PartnerModuleService | null
    brandNameCache?: Map<string, string | null>
    verification?: VerificationModuleService | null
    container?: MedusaContainer | null
  }
): Promise<SellerProductManagerRow> {
  const preview = await buildProductCloudPreview(productCloud, product.id)
  const versions = (await productCloud.listProductVersions({
    product_id: product.id,
  })) as VersionRow[]
  const working = pickWorkingVersion(versions)
  const media = working
    ? ((await productCloud.listProductMedias(
        { product_version_id: working.id },
        { order: { sort_order: "ASC" } }
      )) as MediaRow[])
    : []
  const primary =
    media.find((m) => m.media_type === "Hoofdafbeelding") || media[0] || null

  const variants = (await productCloud.listProductVariants({
    product_id: product.id,
  })) as VariantRow[]

  const identifierIds: string[] = []
  let mpnValue: string | null = null
  for (const v of variants) {
    const ids = (await productCloud.listIdentifiers({
      product_variant_id: v.id,
    })) as IdentifierRow[]
    for (const idRow of ids) {
      identifierIds.push(idRow.id)
      if (idRow.identifier_type === "MPN" && !mpnValue) {
        mpnValue = idRow.identifier_value
      }
    }
  }

  const links = await productCloud.listProductCategories({
    product_id: product.id,
  })
  const categoryIds = links.map((l: { category_id: string }) => l.category_id)
  const categories =
    categoryIds.length > 0
      ? await productCloud.listCategories({ id: categoryIds })
      : []

  for (const cat of categories as Array<{
    id: string
    slug?: string | null
    name: string
  }>) {
    if (cat.slug) {
      await productCloud.ensureCategoryAttributeCatalog(cat.id, cat.slug)
    }
  }

  const defs: AttrDefRow[] = []
  for (const catId of categoryIds) {
    const rows = (await productCloud.listAttributeDefinitions({
      category_id: catId,
    })) as AttrDefRow[]
    defs.push(...rows.filter((d) => d.is_active !== false))
  }

  const values = working
    ? ((await productCloud.listAttributeValues({
        product_version_id: working.id,
      })) as AttrValRow[])
    : []
  const valueByDef = new Map(
    values.map((v) => [v.attribute_definition_id, v.value])
  )

  let maps = opts?.offerMaps ?? null
  if (!maps && commerce) {
    maps = await loadSellerOfferLookup(commerce, sellerId)
  }

  const offerSummaries: SellerOfferSummary[] = []
  for (const id of identifierIds.length ? identifierIds : [preview.identifier_id].filter(Boolean) as string[]) {
    offerSummaries.push(
      await loadOfferForIdentifier(commerce, sellerId, id, maps)
    )
  }
  if (offerSummaries.length === 0 && preview.identifier_id) {
    offerSummaries.push(
      await loadOfferForIdentifier(
        commerce,
        sellerId,
        preview.identifier_id,
        maps
      )
    )
  }

  const offersAgg = aggregateOffers(offerSummaries)
  const offer =
    offerSummaries.find((s) => s.offer_id === offersAgg.primary_offer_id) ||
    offerSummaries[0] ||
    emptyOffer(preview.identifier_id)

  const resolvedManufacturer = await resolveManufacturerForCompleteness(
    opts?.partner ?? null,
    product.manufacturer_id,
    opts?.container ?? null,
    product.id
  )

  const attributes = applyGpsrComplianceAttributes(
    defs.map((d) => ({
      code: d.code || d.id,
      name: d.name,
      tier: (d.requirement_tier ||
        (d.is_required ? "category_required" : "optional")) as RequirementTier,
      value: valueByDef.get(d.id) ?? null,
    })),
    resolvedManufacturer
  )
  const ceValue =
    attributes.find((a) => a.code === "ce_marking")?.value?.trim() || null
  const collectsData =
    attributes.find((a) => a.code === "collects_data")?.value?.trim() || null
  const ceRequiredForCategory = categoryRequiresCeMarking(
    preview.category_names[0]
      ? slugifyCategoryName(preview.category_names[0])
      : null,
    preview.category_names
  )

  let mieClaimed = false
  let mieFacilityId: string | null = null
  let evidenceRows: Array<Record<string, unknown>> = []
  if (opts?.verification) {
    try {
      evidenceRows = (await opts.verification.listProductOriginEvidences({
        product_id: product.id,
      })) as Array<Record<string, unknown>>
    } catch {
      evidenceRows = []
    }
  }
  if (opts?.container) {
    try {
      const mie = await loadMadeInEuropeForProduct(opts.container, product.id)
      mieClaimed = Boolean(mie?.score?.is_made_in_europe)
      mieFacilityId =
        (mie as { production_facility_id?: string | null })
          ?.production_facility_id ??
        (mie as { facility?: { id?: string } | null })?.facility?.id ??
        null
    } catch {
      mieClaimed = false
      mieFacilityId = null
    }
  }
  if (
    !mieClaimed &&
    evidenceRows.some((row) => evidenceKindOf(row as EvidenceRow) === "made_in_europe")
  ) {
    mieClaimed = true
  }

  const effectiveManufacturerId = resolveEffectiveManufacturerId({
    manufacturer_id: product.manufacturer_id,
    mie_facility_id: mieFacilityId,
    resolved_manufacturer_name: resolvedManufacturer?.name ?? null,
  })

  const shippingProfileId =
    (product as { shipping_profile_id?: string | null }).shipping_profile_id ??
    null
  let shippingProfileSummary: SellerProductManagerRow["shipping_profile"] = null
  if (shippingProfileId && commerce) {
    try {
      const [profile] = await commerce.listSellerShippingProfiles({
        id: shippingProfileId,
      })
      if (profile && profile.seller_id === sellerId) {
        const { enrichShippingProfile } = await import(
          "../../../modules/commerce-cloud/shipping-profile-engine"
        )
        const enriched = enrichShippingProfile(profile, 0)
        shippingProfileSummary = {
          id: enriched.id,
          name: enriched.name,
          status: enriched.status,
          active_country_count: enriched.active_country_count,
          min_shipping_cost: enriched.min_shipping_cost,
        }
      }
    } catch {
      shippingProfileSummary = null
    }
  }

  const completeness = computeProductCompleteness({
    basis: {
      title: working?.title ?? preview.title,
      brand_id: product.brand_id,
      manufacturer_id: effectiveManufacturerId,
      category_names: preview.category_names,
      identifier_value: preview.identifier_value,
      has_primary_image: !!primary,
    },
    attributes,
    offer: {
      has_offer: offersAgg.offer_count > 0,
      has_price: offersAgg.price != null && offersAgg.price > 0,
      has_stock_configured: offersAgg.stock_total != null,
      has_delivery:
        Boolean(shippingProfileId) ||
        offersAgg.delivery_days_max != null ||
        offer.shipping_cost != null,
      has_shipping_profile: Boolean(shippingProfileId),
      sales_status: offersAgg.sales_status,
      is_sellable: offersAgg.is_sellable,
    },
    rules: {
      ce_required_for_category: ceRequiredForCategory,
      mie_claimed: mieClaimed,
      publication_status: working?.publication_status ?? null,
    },
    documents: buildDocumentInputs({
      mieClaimed,
      ceValue,
      collectsData,
      ceRequiredForCategory,
      evidence: evidenceRows,
    }),
  })

  let brand_name: string | null = null
  if (opts?.brandNameCache?.has(product.brand_id)) {
    brand_name = opts.brandNameCache.get(product.brand_id) ?? null
  } else {
    brand_name = await resolveBrandName(opts?.partner ?? null, product.brand_id)
    opts?.brandNameCache?.set(product.brand_id, brand_name)
  }

  const rowBase = {
    id: product.id,
    brand_id: product.brand_id,
    brand_name,
    manufacturer_id: product.manufacturer_id,
    lifecycle_status: product.lifecycle_status,
    current_owner_seller_id: product.current_owner_seller_id,
    title: working?.title ?? preview.title,
    description: working?.description ?? null,
    category_names: preview.category_names,
    primary_image_url: primary?.storage_reference ?? null,
    identifier_id: preview.identifier_id,
    identifier_type: preview.identifier_type,
    identifier_value: preview.identifier_value,
    mpn_value: mpnValue,
    publication_status: working?.publication_status ?? null,
    version_id: working?.id ?? null,
    approval_status:
      working?.publication_status === "In review"
        ? "pending_admin_approval"
        : working?.publication_status === "Gepubliceerd"
          ? "approved"
          : working?.approval_rejection_reason
            ? "rejected"
            : "none",
    approval_rejection_reason: working?.approval_rejection_reason ?? null,
    approval_requested_at: working?.approval_requested_at ?? null,
    workflow_status: resolveWorkflowStatus({
      publication_status: working?.publication_status ?? null,
      approval_rejection_reason: working?.approval_rejection_reason ?? null,
      completeness,
      offer_paused: offersAgg.sales_status === "paused",
    }),
    variant_count: variants.length,
    regular_customer_price: moneyNumber(product.regular_customer_price),
    offer,
    offers: offersAgg,
    completeness,
    sku_hint: offersAgg.sku_display,
    shipping_profile_id: shippingProfileId,
    shipping_profile: shippingProfileSummary,
  }

  return {
    ...rowBase,
    actions: resolveProductActions(rowBase),
  }
}

export async function buildSellerProductManagerDetail(
  productCloud: ProductCloudModuleService,
  commerce: CommerceCloudModuleService | null,
  productId: string,
  sellerId: string,
  partner?: PartnerModuleService | null,
  container?: MedusaContainer | null
) {
  const product = await productCloud.retrieveProduct(productId)
  if (product.current_owner_seller_id !== sellerId) {
    return null
  }

  let verification: VerificationModuleService | null = null
  if (container) {
    try {
      verification = container.resolve(VERIFICATION_MODULE) as VerificationModuleService
    } catch {
      verification = null
    }
  }

  const offerMaps = await loadSellerOfferLookup(commerce, sellerId)
  const row = await buildSellerProductManagerRow(
    productCloud,
    commerce,
    product,
    sellerId,
    {
      offerMaps,
      partner: partner ?? null,
      verification,
      container: container ?? null,
    }
  )

  const versions = await productCloud.listProductVersions({
    product_id: productId,
  })
  const working = pickWorkingVersion(versions as VersionRow[])
  const media = working
    ? await productCloud.listProductMedias(
        { product_version_id: working.id },
        { order: { sort_order: "ASC" } }
      )
    : []
  const documents = working
    ? await productCloud.listProductDocuments({
        product_version_id: working.id,
      })
    : []

  const links = await productCloud.listProductCategories({
    product_id: productId,
  })
  const categoryIds = links.map((l: { category_id: string }) => l.category_id)
  const defs: AttrDefRow[] = []
  for (const catId of categoryIds) {
    const rows = (await productCloud.listAttributeDefinitions({
      category_id: catId,
    })) as AttrDefRow[]
    defs.push(...rows.filter((d) => d.is_active !== false))
  }
  const values = working
    ? ((await productCloud.listAttributeValues({
        product_version_id: working.id,
      })) as AttrValRow[])
    : []
  const valueByDef = new Map(
    values.map((v) => [v.attribute_definition_id, v])
  )

  const manufacturer = await resolveManufacturerForCompleteness(
    partner ?? null,
    product.manufacturer_id,
    container ?? null,
    productId
  )
  const schema = applyGpsrComplianceAttributes(
    defs
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        data_type: d.data_type,
        unit: d.unit,
        help_text: d.help_text ?? null,
        is_active: d.is_active !== false,
        is_required: d.is_required,
        requirement_tier:
          d.requirement_tier ||
          (d.is_required ? "category_required" : "optional"),
        option_values: d.option_values ? JSON.parse(d.option_values) : null,
        value: valueByDef.get(d.id)?.value ?? null,
        attribute_value_id: valueByDef.get(d.id)?.id ?? null,
      })),
    manufacturer
  )

  const variants = (await productCloud.listProductVariants({
    product_id: productId,
  })) as VariantRow[]
  const variantViews = []
  for (const v of variants) {
    const ids = (await productCloud.listIdentifiers({
      product_variant_id: v.id,
    })) as IdentifierRow[]
    const offers = []
    for (const idRow of ids) {
      const all = await loadOffersForIdentifier(
        commerce,
        sellerId,
        idRow.id,
        offerMaps
      )
      offers.push(...all)
    }
    variantViews.push({
      ...v,
      identifiers: ids,
      offers,
    })
  }

  const fieldChanges = await productCloud.listProductFieldChanges(
    { product_id: productId },
    { order: { created_at: "DESC" } }
  )

  return {
    ...row,
    working_version: working,
    versions,
    media,
    documents,
    schema,
    variants: variantViews,
    field_changes: fieldChanges,
  }
}

export type ProductListQuery = {
  q?: string
  filter?: string
  sort?: string
}

export function filterAndSortProductRows(
  rows: SellerProductManagerRow[],
  query: ProductListQuery
): SellerProductManagerRow[] {
  const q = (query.q || "").trim().toLowerCase()
  const filter = query.filter || "all"
  const sort = query.sort || "newest"

  let out = rows.filter((p) => {
    const stock = p.offers.stock_total ?? p.offer.stock
    const quality = p.completeness.information_quality
    const sales = p.offers.sales_status ?? p.offer.sales_status
    const pub = p.publication_status || "Concept"

    if (filter === "for_sale" && !p.offers.is_sellable && !p.offer.is_sellable)
      return false
    if (filter === "paused" && sales !== "paused" && sales !== "mixed")
      return false
    if (filter === "no_stock" && !(typeof stock === "number" && stock <= 0))
      return false
    if (filter === "incomplete" && quality !== "insufficient") return false
    if (filter === "sufficient" && quality !== "sufficient") return false
    if (filter === "complete" && quality !== "complete") return false
    if (filter === "published" && pub !== "Gepubliceerd") return false
    if (filter === "unpublished" && pub === "Gepubliceerd") return false
    if (
      filter === "pending_approval" &&
      pub !== "In review"
    )
      return false

    if (!q) return true
    const hay = [
      p.title,
      p.identifier_value,
      p.id,
      p.brand_id,
      p.brand_name,
      p.offer.seller_sku,
      p.offers.sku_display,
      p.sku_hint,
      ...(p.category_names || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })

  out = [...out].sort((a, b) => {
    if (sort === "title") {
      return (a.title || "").localeCompare(b.title || "", "nl")
    }
    if (sort === "stock") {
      return (b.offers.stock_total ?? -1) - (a.offers.stock_total ?? -1)
    }
    if (sort === "price") {
      return (a.offers.price ?? Number.POSITIVE_INFINITY) -
        (b.offers.price ?? Number.POSITIVE_INFINITY)
    }
    // newest — id/time proxy: reverse id lexical is weak; keep input order (listProducts order)
    return 0
  })

  if (sort === "newest") {
    out = out.reverse()
  }

  return out
}
