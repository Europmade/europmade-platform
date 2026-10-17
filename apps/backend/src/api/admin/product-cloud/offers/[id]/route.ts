import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"

type RouteParams = { id: string }

type OfferBody = {
  base_price?: number | null
  promo_price?: number | null
  shipping_cost?: number | null
  quantity_available?: number | null
  seller_sku?: string | null
  delivery_days_max?: number | null
  sales_status?: "active" | "paused"
  shipping_profile_id?: string | null
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function loadOfferView(
  commerce: CommerceCloudModuleService,
  productCloud: ProductCloudModuleService,
  partner: PartnerModuleService,
  offerId: string
) {
  const offer = await commerce.retrieveOffer(offerId)
  const identifier = await productCloud.retrieveIdentifier(offer.identifier_id).catch(() => null)
  const variant = identifier
    ? await productCloud
        .retrieveProductVariant((identifier as { product_variant_id: string }).product_variant_id)
        .catch(() => null)
    : null
  const productId = (variant as { product_id?: string } | null)?.product_id || null
  let title: string | null = null
  let primaryImage: string | null = null
  if (productId) {
    const versions = (await productCloud.listProductVersions({ product_id: productId })) as Array<{
      id: string
      title: string
      publication_status: string
    }>
    const working = versions.find((row) => row.publication_status === "Gepubliceerd") || versions[0]
    title = working?.title || null
    if (working) {
      const media = (await productCloud.listProductMedias(
        { product_version_id: working.id },
        { order: { sort_order: "ASC" }, take: 8 }
      )) as Array<{ media_type: string; storage_reference?: string | null }>
      const primary =
        media.find((item) => item.media_type === "Hoofdafbeelding") ||
        media.find((item) => item.media_type !== "Video")
      primaryImage = primary?.storage_reference || null
    }
  }
  let sellerName = offer.seller_id
  try {
    const seller = await partner.retrieveSeller(offer.seller_id, { relations: ["company"] })
    const company = seller.company as { legal_name?: string } | undefined
    sellerName = company?.legal_name?.trim() || sellerName
  } catch {
    sellerName = offer.seller_id
  }
  const prices = (await commerce.listOfferPrices({ offer_id: offer.id }, { take: 1 })) as Array<{
    id: string
    base_price?: unknown
    promo_price?: unknown
    shipping_cost?: unknown
    extra_delivery_cost?: unknown
  }>
  const stock = (await commerce.listOfferInventories({ offer_id: offer.id }, { take: 1 })) as Array<{
    id: string
    quantity_available?: number
  }>
  let shipping: {
    id: string
    name: string
    description: string | null
    status: string
    country_rates: unknown
    processing_settings: unknown
    carrier_mode: string
  } | null = null
  if (offer.shipping_profile_id) {
    try {
      const profile = await commerce.retrieveSellerShippingProfile(offer.shipping_profile_id)
      shipping = {
        id: profile.id,
        name: profile.name,
        description: profile.description ?? null,
        status: profile.status,
        country_rates: profile.country_rates,
        processing_settings: profile.processing_settings,
        carrier_mode: profile.carrier_mode,
      }
    } catch {
      shipping = null
    }
  }
  let shippingProfiles: Array<{ id: string; name: string; status: string }> = []
  try {
    const rows = (await commerce.listSellerShippingProfiles(
      { seller_id: offer.seller_id },
      { take: 50 }
    )) as Array<{ id: string; name: string; status: string }>
    shippingProfiles = rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
    }))
  } catch {
    shippingProfiles = []
  }
  return {
    id: offer.id,
    product_id: productId,
    title,
    primary_image_url: primaryImage,
    identifier_value: (identifier as { identifier_value?: string } | null)?.identifier_value || null,
    seller_id: offer.seller_id,
    seller_name: sellerName,
    region_code: offer.region_code,
    seller_sku: offer.seller_sku,
    sales_status: offer.sales_status,
    delivery_days_max: offer.delivery_days_max,
    shipping_profile_id: offer.shipping_profile_id,
    shipping_profile: shipping,
    shipping_profiles: shippingProfiles,
    base_price: prices[0]?.base_price ?? null,
    promo_price: prices[0]?.promo_price ?? null,
    shipping_cost: prices[0]?.shipping_cost ?? null,
    extra_delivery_cost: prices[0]?.extra_delivery_cost ?? null,
    quantity_available: stock[0]?.quantity_available ?? null,
    price_id: prices[0]?.id || null,
    inventory_id: stock[0]?.id || null,
  }
}

/** GET /admin/product-cloud/offers/:id */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const offer = await loadOfferView(commerce, productCloud, partner, id)
  res.json({ offer })
}

/**
 * POST /admin/product-cloud/offers/:id
 * Updates only this offer. Central product fields are not written.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const body = (req.body || {}) as OfferBody
  const commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const current = await commerce.retrieveOffer(id)
  const offerPatch: Record<string, unknown> = { id }
  if (body.seller_sku !== undefined) offerPatch.seller_sku = body.seller_sku?.trim() || null
  if (body.delivery_days_max !== undefined) {
    offerPatch.delivery_days_max =
      body.delivery_days_max == null ? null : Math.max(0, Math.floor(Number(body.delivery_days_max)))
  }
  if (body.sales_status === "active" || body.sales_status === "paused") {
    offerPatch.sales_status = body.sales_status
  }
  if (body.shipping_profile_id !== undefined) {
    const profileId = body.shipping_profile_id?.trim() || null
    if (profileId) {
      const profile = await commerce.retrieveSellerShippingProfile(profileId)
      if (profile.seller_id !== current.seller_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Dit verzendprofiel hoort bij een andere seller."
        )
      }
    }
    offerPatch.shipping_profile_id = profileId
  }
  if (Object.keys(offerPatch).length > 1) {
    await commerce.updateOffers(offerPatch)
  }
  const prices = (await commerce.listOfferPrices({ offer_id: id }, { take: 1 })) as Array<{ id: string }>
  const pricePatch: Record<string, unknown> = {}
  if (body.base_price !== undefined) pricePatch.base_price = num(body.base_price) ?? 0
  if (body.promo_price !== undefined) pricePatch.promo_price = num(body.promo_price)
  if (body.shipping_cost !== undefined) pricePatch.shipping_cost = num(body.shipping_cost) ?? 0
  if (Object.keys(pricePatch).length && prices[0]) {
    await commerce.updateOfferPrices({ id: prices[0].id, ...pricePatch })
  }
  if (body.quantity_available !== undefined) {
    const stock = (await commerce.listOfferInventories({ offer_id: id }, { take: 1 })) as Array<{ id: string }>
    const quantity = Math.max(0, Math.floor(Number(body.quantity_available) || 0))
    if (stock[0]) await commerce.updateOfferInventories({ id: stock[0].id, quantity_available: quantity })
  }
  const offer = await loadOfferView(commerce, productCloud, partner, id)
  res.json({ offer })
}
