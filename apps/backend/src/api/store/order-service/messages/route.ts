import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"

/** Buyer-inbox: conversaties van de klant. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const conversations = await orders.listEmConversations(
    { customer_id: customerId },
    { order: { last_message_at: "DESC" } }
  )

  const threads = []
  for (const conversation of conversations) {
    const messages = await orders.listOrderMessages(
      { conversation_id: conversation.id },
      { order: { created_at: "DESC" } }
    )
    const last = messages[0] ?? null
    let order_number: string | null = null
    if (conversation.order_id) {
      try {
        const order = await orders.retrieveEmOrder(conversation.order_id)
        order_number = order.order_number
      } catch {
        order_number = null
      }
    }
    threads.push({
      id: conversation.id,
      conversation_id: conversation.id,
      order_id: conversation.order_id,
      order_number,
      seller_id: conversation.seller_id,
      customer_id: conversation.customer_id,
      subject: conversation.subject,
      status: conversation.status,
      message_count: messages.length,
      last_message_at: conversation.last_message_at
        ? new Date(conversation.last_message_at).toISOString()
        : last?.created_at
          ? new Date(last.created_at).toISOString()
          : null,
      last_body_preview: last ? last.body.slice(0, 120) : null,
    })
  }

  res.json({ threads, count: threads.length })
}
