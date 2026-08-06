import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  newGuestCartToken,
  resolveCartIdentity,
} from "./cart-identity"

export type CartIdentity = {
  customer_id: string | null
  guest_token: string | null
}

/**
 * Customer (sessie) of gast (`x-guest-cart-token`).
 * Ontbreekt beide → nieuwe guest token + response-header.
 */
export function requireCartIdentity(
  req: MedusaRequest,
  res: MedusaResponse
): CartIdentity {
  const resolved = resolveCartIdentity(req)
  if (resolved.customer_id) {
    return { customer_id: resolved.customer_id, guest_token: null }
  }
  if (resolved.guest_token) {
    return { customer_id: null, guest_token: resolved.guest_token }
  }
  const guest_token = newGuestCartToken()
  res.setHeader("x-guest-cart-token", guest_token)
  res.setHeader(
    "Access-Control-Expose-Headers",
    "x-guest-cart-token"
  )
  return { customer_id: null, guest_token }
}

export function assertOfferIdIsCommerceCloud(offerId: string) {
  if (!offerId.startsWith("offr_")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Alleen Commerce Cloud Offer-ID's (offr_…) zijn toegestaan."
    )
  }
}
