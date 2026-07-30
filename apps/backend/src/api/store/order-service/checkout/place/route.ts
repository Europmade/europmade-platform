import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { placeOrderWorkflow } from "../../../../../workflows/order-service"
import type { StoreCheckoutPlaceBodyInput } from "../../validators"

/**
 * Plaats bestelling na geslaagde betaling (ADR-0021 simulated / ADR-0018 Stripe later).
 * Server-side ordersplitsing per seller + Offer-snapshots.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCheckoutPlaceBodyInput>,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const body = req.validatedBody

  const { result } = await placeOrderWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
      payment_reference: body.payment_reference,
      payment_mode: body.payment_mode,
      shipping_address: body.shipping_address,
      billing_address: body.billing_address,
      lines: body.lines,
    },
  })

  res.status(result.created ? 201 : 200).json(result)
}
