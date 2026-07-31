import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"

type RouteParams = { id: string }

/** Klant: retourdetail (eigen orders). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const ret = await orders.retrieveEmReturn(id)
  const line = await orders.retrieveOrderLine(ret.order_line_id)
  const order = await orders.retrieveEmOrder(line.order_id)
  if (order.customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag alleen je eigen retouren bekijken."
    )
  }

  res.json({
    return: ret,
    order_id: order.id,
    order_number: order.order_number,
    seller_id: order.seller_id,
    order_line: line,
  })
}
