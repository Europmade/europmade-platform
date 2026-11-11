import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { upsertOfferWorkflow } from "../../../../workflows/commerce-cloud"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import { assertPermission } from "../../../../modules/partner/permissions"
import { buildProductCloudPreview } from "../../product-cloud/product-preview"
import { buildEffectivePriceView } from "../../../../modules/commerce-cloud/offer-pricing"
import {
  evaluateOfferSellability,
  publicationStatusForIdentifier,
  shippingProfileFacts,
} from "../../../../modules/commerce-cloud/offer-sellability"
import type { StoreUpsertOfferBodyInput } from "../validators"

/** Eigen offers van de goedgekeurde seller. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const identifierId =
    typeof req.query.identifier_id === "string"
      ? req.query.identifier_id
      : undefined
  const regionCode =
    typeof req.query.region_code === "string"
      ? req.query.region_code.toUpperCase()
      : undefined

  const filters: Record<string, string> = { seller_id: seller.id }
  if (identifierId) filters.identifier_id = identifierId
  if (regionCode) filters.region_code = regionCode

  const offers = await commerce.listOffers(filters)
  const enriched = []
  const publicationCache = new Map<string, string | null>()
  for (const offer of offers) {
    const [inventory] = await commerce.listOfferInventories({
      offer_id: offer.id,
    })
    const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
    const publicationStatus = await publicationStatusForIdentifier(
      productCloud,
      offer.identifier_id,
      publicationCache
    )
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
    const view =
      price != null
        ? buildEffectivePriceView({
            base_price: Number(price.base_price),
            shipping_cost: Number(price.shipping_cost),
            extra_delivery_cost:
              price.extra_delivery_cost != null
                ? Number(price.extra_delivery_cost)
                : null,
            promo_price:
              price.promo_price != null ? Number(price.promo_price) : null,
            promo_starts_at: price.promo_starts_at ?? null,
            promo_ends_at: price.promo_ends_at ?? null,
          })
        : null
    const sellability = evaluateOfferSellability({
      has_offer: true,
      sales_status: offer.sales_status,
      base_price: view?.unit_price ?? null,
      has_inventory: inventory != null,
      quantity_available: inventory != null ? Number(inventory.quantity_available) : null,
      delivery_days_max:
        offer.delivery_days_max != null ? Number(offer.delivery_days_max) : null,
      shipping_profile_id: offer.shipping_profile_id,
      shipping_profile_status: profileFacts.shipping_profile_status,
      shipping_profile_serves_region: profileFacts.shipping_profile_serves_region,
      publication_status: publicationStatus,
    })
    enriched.push({
        offer,
        inventory: inventory ?? null,
        price: price ?? null,
        total_price: view?.total_customer_price ?? null,
        is_sellable: sellability.sellable,
        sellability_reasons: sellability.reasons.map((reason) => reason.message),
      })
  }

  let product_preview = null
  if (identifierId) {
    try {
      const identifier = await productCloud.retrieveIdentifier(identifierId)
      const variant = await productCloud.retrieveProductVariant(
        identifier.product_variant_id
      )
      product_preview = await buildProductCloudPreview(
        productCloud,
        variant.product_id,
        {
          identifier_id: identifier.id,
          identifier_type: identifier.identifier_type,
          identifier_value: identifier.identifier_value,
        }
      )
    } catch {
      product_preview = null
    }
  }

  res.json({
    offers: enriched,
    count: enriched.length,
    product_preview,
  })
}

/** Maak of werk Offer + inventory + price bij (transactioneel). */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreUpsertOfferBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  assertPermission(seller, "offers.manage")
  const body = req.validatedBody

  const { result } = await upsertOfferWorkflow(req.scope).run({
    input: {
      seller_id: seller.id,
      identifier_id: body.identifier_id,
      region_code: body.region_code,
      quantity_available: body.quantity_available,
      base_price: body.base_price,
      shipping_cost: body.shipping_cost,
      vat_rate: body.vat_rate,
      seller_sku: body.seller_sku,
      sales_status: body.sales_status,
      delivery_days_max: body.delivery_days_max,
      extra_delivery_cost: body.extra_delivery_cost,
      regular_customer_price: body.regular_customer_price,
      promo_price: body.promo_price,
      promo_starts_at: body.promo_starts_at,
      promo_ends_at: body.promo_ends_at,
      clear_promo: body.clear_promo,
    },
  })

  res.status(result.created ? 201 : 200).json({
    offer_id: result.offer_id,
    inventory_id: result.inventory_id,
    price_id: result.price_id,
    created: result.created,
    buy_box: result.buy_box,
  })
}
