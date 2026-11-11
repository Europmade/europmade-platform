import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import {
  applyBulkOfferCommerce,
  planBulkOfferCommerce,
  type BulkOfferSnapshot,
} from "../../../../../modules/commerce-cloud/bulk-offer-commerce"
import { shippingProfileFacts } from "../../../../../modules/commerce-cloud/offer-sellability"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { assertPermission } from "../../../../../modules/partner/permissions"
import { resolveApprovedSeller } from "../../resolve-seller"
import type { StoreBulkOfferCommerceBodyInput } from "../../validators"
import { executeRecomputeBuyBox } from "../../../../../workflows/commerce-cloud/recompute-buy-box"
import { loadSellerOfferLookup } from "../../product-manager"
import { LIST_QUERY_TAKE } from "../../seller-product-list-cache"

type OfferRow = {
  id: string
  seller_id: string
  identifier_id: string
  region_code: string
  sales_status?: string | null
  delivery_days_max?: number | null
  shipping_profile_id?: string | null
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreBulkOfferCommerceBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  assertPermission(seller, "products.manage")
  const body = req.validatedBody
  if (!(body.product_ids?.length || body.offer_ids?.length)) {
    res.status(400).json({ message: "Selecteer minstens één aanbod." })
    return
  }
  const commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const confirm = body.confirm === true

  const offersByProduct = await mapSellerOffersToProducts(
    commerce,
    productCloud,
    seller.id
  )
  const offers = await loadSelectedOffers(
    commerce,
    productCloud,
    seller.id,
    body.product_ids || [],
    body.offer_ids || [],
    offersByProduct
  )
  const plan = planBulkOfferCommerce({
    actor_seller_id: seller.id,
    offers,
    delivery_days_max: body.delivery_days_max,
    quantity_available: body.quantity_available,
  })

  if (!confirm || !plan.apply_allowed) {
    res.json({
      applied: false,
      message: plan.field_error || "Controleer de preview en bevestig daarna.",
      ...plan,
    })
    return
  }

  const result = await applyBulkOfferCommerce(
    plan,
    { seller_id: seller.id, actor_customer_id: req.auth_context.actor_id },
    {
      updateDelivery: async (offerId, days) => {
        await commerce.updateOffers({ id: offerId, delivery_days_max: days })
      },
      updateStock: async (inventoryId, quantity) => {
        await commerce.updateOfferInventories({
          id: inventoryId,
          quantity_available: quantity,
        })
      },
      createStock: async (offerId, quantity) => {
        await commerce.createOfferInventories({
          offer_id: offerId,
          quantity_available: quantity,
        })
      },
      audit: async (row) => {
        await productCloud.createProductFieldChanges(row)
      },
      recompute: async (identifierId, regionCode) => {
        await executeRecomputeBuyBox(req.scope, {
          identifier_id: identifierId,
          region_code: regionCode,
        })
      },
    }
  )

  const failedRows = result.rows.filter((row) => row.status === "failed")
  res.json({
    applied: result.applied_count > 0 && result.failed_count === 0,
    applied_count: result.applied_count,
    failed_count: result.failed_count,
    message:
      result.failed_count > 0
        ? `${result.applied_count} aanbiedingen bijgewerkt, ${result.failed_count} mislukt.`
        : `${result.applied_count} aanbiedingen bijgewerkt.`,
    ...plan,
    rows: result.rows,
    eligible_count: result.applied_count,
    excluded_count: result.rows.length - result.applied_count,
    failures: failedRows.map((row) => ({
      offer_id: row.offer_id,
      product_title: row.product_title,
      reason: row.reason,
    })),
  })
}

async function mapSellerOffersToProducts(
  commerce: CommerceCloudModuleService,
  productCloud: ProductCloudModuleService,
  sellerId: string
): Promise<Map<string, OfferRow[]>> {
  const maps = await loadSellerOfferLookup(commerce, sellerId)
  const identifierIds = [...maps.byIdentifier.keys()]
  const byProduct = new Map<string, OfferRow[]>()
  if (identifierIds.length === 0) return byProduct
  const identifiers = (await productCloud.listIdentifiers(
    { id: identifierIds },
    { take: LIST_QUERY_TAKE }
  )) as Array<{ id: string; product_variant_id: string }>
  const variantIds = [
    ...new Set(identifiers.map((row) => row.product_variant_id).filter(Boolean)),
  ]
  const variants = variantIds.length
    ? ((await productCloud.listProductVariants(
        { id: variantIds },
        { take: LIST_QUERY_TAKE }
      )) as Array<{ id: string; product_id: string }>)
    : []
  const productByVariant = new Map(variants.map((row) => [row.id, row.product_id]))
  for (const identifier of identifiers) {
    const productId = productByVariant.get(identifier.product_variant_id)
    if (!productId) continue
    const list = byProduct.get(productId) || []
    for (const offer of maps.byIdentifier.get(identifier.id) || []) {
      if (list.some((row) => row.id === offer.id)) continue
      list.push(offer)
    }
    byProduct.set(productId, list)
  }
  return byProduct
}

async function loadSelectedOffers(
  commerce: CommerceCloudModuleService,
  productCloud: ProductCloudModuleService,
  sellerId: string,
  productIds: string[],
  offerIds: string[],
  offersByProduct: Map<string, OfferRow[]>
): Promise<BulkOfferSnapshot[]> {
  const snapshots: BulkOfferSnapshot[] = []
  const seen = new Set<string>()

  for (const productId of productIds) {
    const ownOffers = offersByProduct.get(productId) || []
    if (ownOffers.length === 0) {
      const title = await productTitle(productCloud, productId)
      snapshots.push({
        offer_id: "",
        seller_id: sellerId,
        product_id: productId,
        product_title: title.title,
        identifier_value: null,
        region_code: null,
        identifier_id: null,
        inventory_id: null,
        publication_status: title.publication_status,
        sales_status: null,
        current_delivery_days_max: null,
        current_quantity_available: null,
        missing: true,
      })
      continue
    }
    for (const offer of ownOffers) {
      if (seen.has(offer.id)) continue
      seen.add(offer.id)
      snapshots.push(await snapshotOffer(commerce, productCloud, offer, productId))
    }
  }

  for (const offerId of offerIds) {
    if (seen.has(offerId)) continue
    seen.add(offerId)
    let offer: OfferRow | null = null
    try {
      offer = (await commerce.retrieveOffer(offerId)) as OfferRow
    } catch {
      snapshots.push({ ...emptySnapshot(offerId), not_found: true, missing: false })
      continue
    }
    snapshots.push(await snapshotOffer(commerce, productCloud, offer, null))
  }
  return snapshots
}

async function snapshotOffer(
  commerce: CommerceCloudModuleService,
  productCloud: ProductCloudModuleService,
  offer: OfferRow,
  knownProductId: string | null
): Promise<BulkOfferSnapshot> {
  const inventories = (await commerce.listOfferInventories(
    { offer_id: offer.id },
    { take: 20 }
  )) as Array<{ id?: string; offer_id?: string; offer?: { id?: string }; quantity_available?: unknown }>
  const inventory =
    inventories.find(
      (row) => (row.offer_id || row.offer?.id || offer.id) === offer.id
    ) || inventories[0]
  const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
  let profile: { status?: string | null; country_rates?: unknown } | null = null
  if (offer.shipping_profile_id) {
    try {
      profile = await commerce.retrieveSellerShippingProfile(offer.shipping_profile_id)
    } catch {
      profile = null
    }
  }
  const profileFacts = shippingProfileFacts({
    shipping_profile_id: offer.shipping_profile_id,
    region_code: offer.region_code,
    profile,
  })
  const context = await offerContext(productCloud, offer.identifier_id)
  const productId = context.product_id || knownProductId
  const fallback = !context.title && productId ? await productTitle(productCloud, productId) : null
  return {
    offer_id: offer.id,
    seller_id: offer.seller_id,
    product_id: productId,
    product_title: context.title || fallback?.title || null,
    identifier_value: context.identifier_value,
    region_code: offer.region_code,
    identifier_id: offer.identifier_id,
    inventory_id: inventory?.id ? String(inventory.id) : null,
    publication_status: context.publication_status || fallback?.publication_status || null,
    sales_status: offer.sales_status ?? "active",
    base_price: price?.base_price != null ? Number(price.base_price) : null,
    shipping_profile_id: offer.shipping_profile_id ?? null,
    shipping_profile_status: profileFacts.shipping_profile_status,
    shipping_profile_serves_region: profileFacts.shipping_profile_serves_region,
    current_delivery_days_max:
      offer.delivery_days_max != null ? Number(offer.delivery_days_max) : null,
    current_quantity_available:
      inventory?.quantity_available != null ? Number(inventory.quantity_available) : null,
  }
}

function emptySnapshot(offerId: string): BulkOfferSnapshot {
  return {
    offer_id: offerId,
    seller_id: "",
    product_id: null,
    product_title: null,
    identifier_value: null,
    region_code: null,
    identifier_id: null,
    inventory_id: null,
    publication_status: null,
    sales_status: null,
    current_delivery_days_max: null,
    current_quantity_available: null,
    missing: true,
  }
}

async function offerContext(
  productCloud: ProductCloudModuleService,
  identifierId: string
): Promise<{
  product_id: string | null
  title: string | null
  identifier_value: string | null
  publication_status: string | null
}> {
  try {
    const identifier = (await productCloud.retrieveIdentifier(identifierId)) as {
      identifier_value?: string
      product_variant_id: string
    }
    const variant = (await productCloud.retrieveProductVariant(
      identifier.product_variant_id
    )) as { product_id: string }
    const publication = await productTitle(productCloud, variant.product_id)
    return {
      product_id: variant.product_id,
      title: publication.title,
      identifier_value: identifier.identifier_value ?? null,
      publication_status: publication.publication_status,
    }
  } catch {
    return {
      product_id: null,
      title: null,
      identifier_value: null,
      publication_status: null,
    }
  }
}

async function productTitle(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<{ title: string | null; publication_status: string | null }> {
  try {
    const versions = (await productCloud.listProductVersions({
      product_id: productId,
    })) as Array<{ title?: string | null; publication_status?: string | null; version_number?: number }>
    const published = versions.find((row) => row.publication_status === "Gepubliceerd")
    const latest = [...versions].sort(
      (a, b) => Number(b.version_number || 0) - Number(a.version_number || 0)
    )[0]
    const version = published || latest
    return {
      title: version?.title ?? null,
      publication_status: version?.publication_status ?? null,
    }
  } catch {
    return { title: null, publication_status: null }
  }
}
