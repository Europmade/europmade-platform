import { randomUUID } from "node:crypto"
import type { MedusaRequest } from "@medusajs/framework/http"

export function resolveCartIdentity(req: MedusaRequest): {
  customer_id: string | null
  guest_token: string | null
} {
  const actorId = req.auth_context?.actor_id
  if (actorId) {
    return { customer_id: actorId, guest_token: null }
  }
  const header = req.headers["x-guest-cart-token"]
  const guest =
    typeof header === "string" && header.trim().length >= 8
      ? header.trim()
      : null
  return { customer_id: null, guest_token: guest }
}

export function newGuestCartToken(): string {
  return `gst_${randomUUID().replace(/-/g, "")}`
}
