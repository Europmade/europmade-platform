import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import { executeListMessages } from "../../../../../../workflows/order-service"

type RouteParams = { id: string }

/**
 * Beheerder meelezen — alleen bij geëscaleerd retourgeschil
 * (messaging-reviews-qa/spec.md §1).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const result = await executeListMessages(req.scope, id, {
    role: "admin",
    user_id: req.auth_context.actor_id,
  })
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(id)
  res.json({
    order_id: order.id,
    order_number: order.order_number,
    customer_id: order.customer_id,
    seller_id: order.seller_id,
    ...result,
  })
}
