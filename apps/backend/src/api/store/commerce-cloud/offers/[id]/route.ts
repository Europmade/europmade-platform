import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { buildProductCloudPreview } from "../../../product-cloud/product-preview"

type RouteParams = { id: string }

/** Eigen Offer-detail + Product Cloud-preview. */
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
      identifier_type: identifier.identifier_type,
      identifier_value: identifier.identifier_value,
    }
  )

  res.json({
    offer,
    inventory: inventory ?? null,
    price: price ?? null,
    total_price:
      price != null
        ? Number(price.base_price) + Number(price.shipping_cost)
        : null,
    product_preview,
    buy_box: {
      status: "deferred",
      message:
        "Buy Box-positie volgt na S3-04-02/04 (ADR-0014). Aanbod is opgeslagen.",
    },
  })
}
