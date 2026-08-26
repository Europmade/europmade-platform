import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveApprovedSeller } from "../../../../../resolve-seller"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../../../modules/partner/service"
import { buildSellerProductManagerDetail } from "../../../../../product-manager"

type RouteParams = { id: string; versionId: string }

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id, versionId } = req.params as RouteParams

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
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
  if (!detail?.completeness.publishable) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      detail?.completeness.publication_blocked_reasons?.[0] ||
        "Product is niet publiceerbaar. Controleer productinformatie en compliance."
    )
  }

  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Een seller mag een product niet zelf publiceren. Bied het ter goedkeuring aan."
  )
}
