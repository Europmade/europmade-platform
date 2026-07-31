import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"
import { requestReturnWorkflow } from "../../../../workflows/order-service"
import type { StoreRequestReturnBodyInput } from "../validators"

/** Klant: eigen retouren ophalen. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const customerOrders = await orders.listEmOrders({ customer_id: customerId })
  const returns = []
  for (const order of customerOrders) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    for (const line of lines) {
      const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
      for (const ret of lineReturns) {
        returns.push({
          ...ret,
          order_id: order.id,
          order_number: order.order_number,
          seller_id: order.seller_id,
          offer_id: line.offer_id,
        })
      }
    }
  }

  res.json({ returns })
}

/** Klant: retour aanmelden binnen herroepingstermijn. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreRequestReturnBodyInput>,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const { result } = await requestReturnWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
      order_line_id: req.validatedBody.order_line_id,
      reason: req.validatedBody.reason,
    },
  })
  res.status(201).json(result)
}
