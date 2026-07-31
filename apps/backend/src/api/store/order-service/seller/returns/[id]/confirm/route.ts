import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"
import { sellerReturnTransitionWorkflow } from "../../../../../../../workflows/order-service"

type RouteParams = { id: string }

/** Seller: Aangevraagd → Bevestigd. */
export async function POST(
  req: AuthenticatedMedusaRequest,
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
      action: "confirm",
    },
  })
  res.json(result)
}
