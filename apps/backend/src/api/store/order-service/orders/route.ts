import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"

/** Eigen orders van de ingelogde customer. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const list = await orders.listEmOrders({ customer_id: customerId })
  const enriched = []
  for (const order of list) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    enriched.push({ order, lines })
  }

  res.json({ orders: enriched, count: enriched.length })
}
