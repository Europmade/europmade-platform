import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"
import { sellerReturnTransitionWorkflow } from "../../../../../../../workflows/order-service"
import type { StoreSellerRejectReturnBodyInput } from "../../../../validators"

type RouteParams = { id: string }

/** Seller: retour afwijzen met reden. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreSellerRejectReturnBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const { result } = await sellerReturnTransitionWorkflow(req.scope).run({
    input: {
      return_id: id,
      seller_id: seller.id,
      action: "reject",
      decision_reason: req.validatedBody.decision_reason,
    },
  })
  res.json(result)
}
