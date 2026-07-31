import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"

/** Beheerder: retourenlijst (geschillen / force-refund). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const status = typeof req.query.status === "string" ? req.query.status : null

  const filters = status ? { status } : {}
  const list = await orders.listEmReturns(filters)

  const returns = []
  for (const ret of list) {
    const line = await orders.retrieveOrderLine(ret.order_line_id)
    const order = await orders.retrieveEmOrder(line.order_id)
    returns.push({
      ...ret,
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      seller_id: order.seller_id,
      offer_id: line.offer_id,
    })
  }

  res.json({ returns })
}
