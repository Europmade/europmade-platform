import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import {
  guestCheckoutCustomerId,
  parseGuestCheckoutToken,
} from "../../guest-checkout"
import type { StoreClaimGuestOrderBodyInput } from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreClaimGuestOrderBodyInput>,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const headerToken = req.headers["x-guest-checkout-token"]
  const guestToken =
    parseGuestCheckoutToken(req.validatedBody.guest_checkout_token) ??
    parseGuestCheckoutToken(headerToken)

  if (!guestToken) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "guest_checkout_token is verplicht."
    )
  }

  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const result = await orders.claimGuestOrderSet({
    payment_reference: req.validatedBody.payment_reference,
    guest_customer_id: guestCheckoutCustomerId(guestToken),
    customer_id: customerId,
  })

  res.json(result)
}
