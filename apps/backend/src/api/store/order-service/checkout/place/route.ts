import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { placeOrderWorkflow } from "../../../../../workflows/order-service"
import { resolveCartIdentity } from "../../cart-identity"
import {
  guestCheckoutCustomerId,
  parseGuestCheckoutToken,
} from "../../guest-checkout"
import type { StoreCheckoutPlaceBodyInput } from "../../validators"

/**
 * Plaats bestelling na geslaagde betaling (ADR-0021 simulated / ADR-0018 Stripe later).
 * Server-side ordersplitsing per seller + Offer-snapshots.
 */
export async function POST(
  req: MedusaRequest<StoreCheckoutPlaceBodyInput>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id ?? null
  const body = req.validatedBody
  const cartIdentity = resolveCartIdentity(req)
  const headerGuestCheckout = req.headers["x-guest-checkout-token"]
  const guestCheckoutToken =
    parseGuestCheckoutToken(body.guest_checkout_token) ??
    parseGuestCheckoutToken(headerGuestCheckout)

  if (!customerId && !guestCheckoutToken) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "guest_checkout_token is verplicht voor gast-checkout."
    )
  }

  const { result } = await placeOrderWorkflow(req.scope).run({
    input: {
      customer_id: customerId ?? guestCheckoutCustomerId(guestCheckoutToken!),
      guest_token: customerId ? null : cartIdentity.guest_token,
      payment_reference: body.payment_reference,
      payment_mode: body.payment_mode,
      shipping_address: body.shipping_address,
      billing_address: body.billing_address,
      lines: body.lines,
      affiliate_click_id: body.affiliate_click_id ?? null,
      affiliate_coupon_code: body.affiliate_coupon_code ?? null,
    },
  })

  res.status(result.created ? 201 : 200).json(result)
}
