import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"

/** Seller: eigen orders (S3-05-06). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const list = await orders.listEmOrders({ seller_id: seller.id })
  const enriched = []
  for (const order of list) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    const returns = []
    for (const line of lines) {
      const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
      returns.push(...lineReturns)
    }
    enriched.push({ order, lines, returns })
  }

  res.json({ orders: enriched, count: enriched.length })
}
