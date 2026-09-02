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
import type { StoreBulkShippingProfileBodyInput } from "../../validators"
import { syncProfileToProductOffers } from "../../../../../modules/commerce-cloud/shipping-profile-engine"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreBulkShippingProfileBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  assertPermission(seller, "products.manage")
  const body = req.validatedBody
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  if (body.shipping_profile_id) {
    const [profile] = await commerce.listSellerShippingProfiles({
      id: body.shipping_profile_id,
    })
    if (!profile || profile.seller_id !== seller.id) {
      res.status(404).json({ message: "Verzendprofiel niet gevonden." })
      return
    }
  }

  const results: Array<{ product_id: string; ok: boolean; error?: string }> = []
  for (const productId of body.product_ids) {
    try {
      await syncProfileToProductOffers(commerce, productCloud, {
        sellerId: seller.id,
        productId,
        profileId: body.shipping_profile_id,
      })
      results.push({ product_id: productId, ok: true })
    } catch (err: unknown) {
      results.push({
        product_id: productId,
        ok: false,
        error:
          err instanceof Error ? err.message : "Koppelen mislukt.",
      })
    }
  }

  const okCount = results.filter((r) => r.ok).length
  res.json({
    message: `${okCount} product(en) gekoppeld aan verzendprofiel.`,
    results,
  })
}
