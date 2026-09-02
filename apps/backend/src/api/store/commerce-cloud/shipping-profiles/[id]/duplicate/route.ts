import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../modules/commerce-cloud/service"
import { resolveApprovedSeller } from "../../../../product-cloud/resolve-seller"
import {
  assertProfileWritable,
  duplicateShippingProfile,
  enrichShippingProfile,
} from "../../../../../../modules/commerce-cloud/shipping-profile-engine"
import type { StoreDuplicateShippingProfileBodyInput } from "../../../validators"

type RouteParams = { id: string }

export async function POST(
  req: AuthenticatedMedusaRequest<StoreDuplicateShippingProfileBodyInput>,
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

  const created = await duplicateShippingProfile(commerce, {
    sellerId: seller.id,
    profileId: id,
    newName: req.validatedBody.name,
  })
  assertProfileWritable(created, seller.id)

  res.status(201).json({
    shipping_profile: enrichShippingProfile(created, 0),
  })
}
