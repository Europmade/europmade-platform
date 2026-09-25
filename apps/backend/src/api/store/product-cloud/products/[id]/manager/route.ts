import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../modules/commerce-cloud/service"
import { resolveApprovedSeller } from "../../../resolve-seller"
import { buildSellerProductManagerDetail } from "../../../product-manager"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"

type RouteParams = { id: string }

/** Full Seller Product Manager detail (tabs payload). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }

  let partner: PartnerModuleService | null = null
  try {
    partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  } catch {
    partner = null
  }

  const detail = await buildSellerProductManagerDetail(
    productCloud,
    commerce,
    id,
    seller.id,
    partner,
    req.scope
  )
  if (!detail) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag dit product alleen openen als Productbeheerder of als je een eigen aanbod hebt."
    )
  }

  res.json({ product: detail })
}
