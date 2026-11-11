import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import {
  patchOfferWorkflow,
  withdrawOfferWorkflow,
} from "../../../../../workflows/commerce-cloud"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { assertPermission } from "../../../../../modules/partner/permissions"
import { buildProductCloudPreview } from "../../../product-cloud/product-preview"
import { loadBuyBoxForIdentifier } from "../../buy-box-helpers"
import { buildEffectivePriceView } from "../../../../../modules/commerce-cloud/offer-pricing"
import {
  evaluateOfferSellability,
  publicationStatusForIdentifier,
  shippingProfileFacts,
} from "../../../../../modules/commerce-cloud/offer-sellability"
import type { StorePatchOfferBodyInput } from "../../validators"

type RouteParams = { id: string }

function mapOwnBuyBox(
  buy_box: Awaited<ReturnType<typeof loadBuyBoxForIdentifier>>,
  offerId: string
) {
  const own = buy_box.ranked.find((r) => r.offer_id === offerId)
  return {
    status: "computed" as const,
    source: "recompute" as const,
    winning_offer_id: buy_box.winning_offer_id,
    is_winner: own?.is_winner ?? false,
    rank: own?.rank ?? null,
    ranked_count: buy_box.ranked.length,
    competing_offer_count: Math.max(0, buy_box.ranked.length - (own ? 1 : 0)),
    weights: buy_box.weights,
    computed_at: buy_box.computed_at,
  }
}

/** Eigen Offer-detail + Product Cloud-preview + Buy Box-positie. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const offer = await commerce.retrieveOffer(id)
  if (offer.seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag alleen je eigen aanbod bekijken."
    )
  }

  const [inventory] = await commerce.listOfferInventories({
    offer_id: offer.id,
  })
  const [price] = await commerce.listOfferPrices({ offer_id: offer.id })

  const identifier = await productCloud.retrieveIdentifier(
    offer.identifier_id
  )
  const variant = await productCloud.retrieveProductVariant(
    identifier.product_variant_id
  )
  const product_preview = await buildProductCloudPreview(
    productCloud,
    variant.product_id,
    {
      identifier_id: identifier.id,
      identifier_type: identifier.identifier_type,
      identifier_value: identifier.identifier_value,
    }
  )

  const buy_box = await loadBuyBoxForIdentifier(
    req.scope,
    offer.identifier_id,
    offer.region_code
  )

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
  const publicationStatus = await publicationStatusForIdentifier(
    productCloud,
    offer.identifier_id
  )
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

  res.json({
    offer,
    inventory: inventory ?? null,
    price: price ?? null,
    total_price: view?.total_customer_price ?? null,
    is_sellable: sellability.sellable,
    sellability_reasons: sellability.reasons.map((reason) => reason.message),
    product_preview,
    buy_box: mapOwnBuyBox(buy_box, offer.id),
  })
}

/** Gedeeltelijke prijs-/voorraadupdate (S3-04-03). */
export async function PATCH(
  req: AuthenticatedMedusaRequest<StorePatchOfferBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  assertPermission(seller, "offers.manage")
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  const { result } = await patchOfferWorkflow(req.scope).run({
    input: {
      seller_id: seller.id,
      offer_id: id,
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
      actor_customer_id: req.auth_context.actor_id,
    },
  })

  res.json({
    offer_id: result.offer_id,
    inventory_id: result.inventory_id,
    price_id: result.price_id,
    created: false,
    buy_box: result.buy_box,
  })
}

/** Soft-withdraw Offer → OfferWithdrawn + BuyBoxRecomputed (S3-04-03). */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  assertPermission(seller, "offers.manage")
  const { id } = req.params as RouteParams

  const { result } = await withdrawOfferWorkflow(req.scope).run({
    input: {
      seller_id: seller.id,
      offer_id: id,
    },
  })

  res.json({
    withdrawn: true,
    offer_id: result.offer_id,
    identifier_id: result.identifier_id,
    region_code: result.region_code,
    buy_box: result.buy_box,
  })
}
