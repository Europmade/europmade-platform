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
import { buildProductCloudPreview } from "../../product-cloud/product-preview"
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
  for (const offer of offers) {
    const [inventory] = await commerce.listOfferInventories({
      offer_id: offer.id,
    })
    const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
    enriched.push({
      offer,
      inventory: inventory ?? null,
      price: price ?? null,
      total_price:
        price != null
          ? Number(price.base_price) + Number(price.shipping_cost)
          : null,
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
