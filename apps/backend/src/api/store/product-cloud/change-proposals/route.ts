import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { submitChangeProposalWorkflow } from "../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../resolve-seller"
import type { StoreSubmitChangeProposalBodyInput } from "../validators"

/**
 * Inbox + eigen ingediende voorstellen.
 * Owner: In behandeling op eigen producten.
 * Submitter: eigen voorstellen (B-PM7 uitkomstzichtbaarheid).
 */
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

  // Inbox for assigned Productbeheerder (seller kind). Brand-owner managers
  // also see proposals via admin / product detail flows.
  const managedProducts = await productCloud.listProducts({
    product_manager_kind: "seller",
    product_manager_seller_id: seller.id,
  })
  const managedIds = managedProducts.map((p) => p.id)

  const inbox =
    managedIds.length > 0
      ? await productCloud.listChangeProposals({
          product_id: managedIds,
          status: "In behandeling",
        })
      : []

  const submitted = await productCloud.listChangeProposals({
    submitter_seller_id: seller.id,
  })

  res.json({ inbox, submitted, count_inbox: inbox.length })
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreSubmitChangeProposalBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = req.validatedBody

  const { result } = await submitChangeProposalWorkflow(req.scope).run({
    input: {
      product_id: body.product_id,
      submitter_seller_id: seller.id,
      proposed_title: body.proposed_title,
      proposed_description: body.proposed_description,
      proposed_fields: body.proposed_fields ?? null,
      toelichting: body.toelichting,
    },
  })

  res.status(201).json({ change_proposal: result })
}
