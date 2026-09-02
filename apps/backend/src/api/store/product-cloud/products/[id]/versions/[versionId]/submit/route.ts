import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { submitVersionWorkflow } from "../../../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../../../resolve-seller"
import { assertPermission } from "../../../../../../../../modules/partner/permissions"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../../../modules/partner/service"
import { buildSellerProductManagerDetail } from "../../../../../product-manager"
import { assertValidGtinForSubmission } from "../../../../../submit-gates"

type RouteParams = { id: string; versionId: string }

/**
 * POST submit — seller offers a publishable product for admin product approval.
 * Distinct from compliance evidence review. Product stays unpublished.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  assertPermission(seller, "products.submit_approval")
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
        "Product is niet compleet genoeg om ter goedkeuring aan te bieden."
    )
  }
  if (detail.publication_status === "Gepubliceerd") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Dit product is al gepubliceerd."
    )
  }
  if (detail.publication_status === "In review") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Dit product wacht al op productgoedkeuring."
    )
  }

  await assertValidGtinForSubmission(productCloud, id)

  const { result } = await submitVersionWorkflow(req.scope).run({
    input: {
      product_id: id,
      version_id: versionId,
      seller_id: seller.id,
    },
  })

  res.json({
    version: result,
    approval_status: "pending_admin_approval",
  })
}
