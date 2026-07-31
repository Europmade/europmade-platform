import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"

type RouteParams = { id: string }

/** Admin OMC — orderdetail (read-only). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(id)
  const lines = await orders.listOrderLines({ order_id: order.id })
  const [orderSet] = await orders.listOrderSets({ id: order.order_set_id })
  const returns = []
  for (const line of lines) {
    const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
    returns.push(...lineReturns)
  }

  res.json({
    order,
    lines,
    order_set: orderSet ?? null,
    returns,
  })
}
