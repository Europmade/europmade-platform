import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"

/** Seller: retouren op eigen orders. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const sellerOrders = await orders.listEmOrders({ seller_id: seller.id })
  const returns = []
  for (const order of sellerOrders) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    for (const line of lines) {
      const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
      for (const ret of lineReturns) {
        returns.push({
          ...ret,
          order_id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id,
          offer_id: line.offer_id,
        })
      }
    }
  }

  res.json({ returns })
}
