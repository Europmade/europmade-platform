import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"

/** Seller-inbox: eigen orders met berichtdraad. */
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

  const threads = []
  for (const order of list) {
    const messages = await orders.listOrderMessages(
      { order_id: order.id },
      { order: { created_at: "DESC" } }
    )
    const last = messages[0] ?? null
    threads.push({
      order_id: order.id,
      order_number: order.order_number,
      seller_id: order.seller_id,
      customer_id: order.customer_id,
      message_count: messages.length,
      last_message_at: last?.created_at
        ? new Date(last.created_at).toISOString()
        : null,
      last_body_preview: last ? last.body.slice(0, 120) : null,
    })
  }

  threads.sort((a, b) => {
    const at = a.last_message_at ?? ""
    const bt = b.last_message_at ?? ""
    return bt.localeCompare(at)
  })

  res.json({ threads, count: threads.length })
}
