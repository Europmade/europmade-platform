import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { submitClaimWorkflow } from "../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../resolve-seller"
import type { StoreSubmitClaimBodyInput } from "../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const claims = await productCloud.listClaims({
    claimant_seller_id: seller.id,
  })
  res.json({ claims, count: claims.length })
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreSubmitClaimBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )

  const { result } = await submitClaimWorkflow(req.scope).run({
    input: {
      product_id: req.validatedBody.product_id,
      claimant_seller_id: seller.id,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
    },
  })

  res.status(201).json({ claim: result })
}
