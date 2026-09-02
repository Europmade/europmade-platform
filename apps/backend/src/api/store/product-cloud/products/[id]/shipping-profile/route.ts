import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { assertPermission } from "../../../../../modules/partner/permissions"
import { resolveApprovedSeller } from "../../resolve-seller"
import type { StoreProductShippingProfileBodyInput } from "../../validators"
import { syncProfileToProductOffers } from "../../../../../modules/commerce-cloud/shipping-profile-engine"

type RouteParams = { id: string }

export async function PATCH(
  req: AuthenticatedMedusaRequest<StoreProductShippingProfileBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  assertPermission(seller, "products.manage")
  const { id } = req.params as RouteParams
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const result = await syncProfileToProductOffers(commerce, productCloud, {
    sellerId: seller.id,
    productId: id,
    profileId: req.validatedBody.shipping_profile_id,
  })

  const product = await productCloud.retrieveProduct(id)
  res.json({
    product_id: id,
    shipping_profile_id: product.shipping_profile_id ?? null,
    offers_updated: result.offers_updated,
  })
}
