import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import { guestCheckoutCustomerId, parseGuestCheckoutToken } from "../../../guest-checkout"

type RouteParams = { payment_reference: string }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { payment_reference } = req.params as RouteParams
  const customerId = req.auth_context?.actor_id ?? null
  const headerGuestCheckout = req.headers["x-guest-checkout-token"]
  const guestCheckoutToken = parseGuestCheckoutToken(headerGuestCheckout)

  const lookupCustomerId = customerId
    ? customerId
    : guestCheckoutToken
      ? guestCheckoutCustomerId(guestCheckoutToken)
      : null

  if (!lookupCustomerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Inloggen of x-guest-checkout-token is verplicht."
    )
  }

  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const orderSets = await orders.listOrderSets({
    payment_reference,
    customer_id: lookupCustomerId,
  })
  if (orderSets.length === 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Bestelling niet gevonden.")
  }

  const rows = await orders.listEmOrders({ order_set_id: orderSets[0].id })
  const enriched = []
  for (const order of rows) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    enriched.push({ order, lines })
  }

  res.json({
    order_set_id: orderSets[0].id,
    payment_reference,
    orders: enriched,
    guest: !customerId,
  })
}
