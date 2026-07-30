import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"

type RouteParams = { id: string }

/** Order-detail met onveranderlijke Offer-snapshots. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const order = await orders.retrieveEmOrder(id)
  if (order.customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag alleen je eigen orders bekijken."
    )
  }

  const lines = await orders.listOrderLines({ order_id: order.id })
  const [orderSet] = await orders.listOrderSets({ id: order.order_set_id })

  res.json({
    order,
    lines,
    order_set: orderSet ?? null,
  })
}
