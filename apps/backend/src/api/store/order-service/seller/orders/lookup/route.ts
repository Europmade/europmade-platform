import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../product-cloud/resolve-seller"

const RESULT_LIMIT = 20

/**
 * GET /store/order-service/seller/orders/lookup?customer_id=&q=
 * Lightweight order picker for compose (optional order link).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const customerId =
    typeof req.query?.customer_id === "string"
      ? req.query.customer_id.trim()
      : ""
  const q =
    typeof req.query?.q === "string" ? req.query.q.trim().toLowerCase() : ""

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "customer_id is verplicht."
    )
  }

  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const list = await orders.listEmOrders({
    seller_id: seller.id,
    customer_id: customerId,
  })

  const filtered = []
  for (const order of list) {
    if (q) {
      const hay = `${order.order_number} ${order.id}`.toLowerCase()
      if (!hay.includes(q)) continue
    }
    filtered.push({
      id: order.id,
      order_number: order.order_number,
    })
    if (filtered.length >= RESULT_LIMIT) break
  }

  res.json({ orders: filtered, count: filtered.length })
}
