import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"

function matchesQuery(haystack: string, q: string): boolean {
  if (!q) return true
  const hay = haystack.toLowerCase()
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((token) => hay.includes(token))
}

/** Seller-inbox: conversaties met status + unread + optional search `q`. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const conversations = await orders.listEmConversations(
    { seller_id: seller.id },
    { order: { last_message_at: "DESC" } }
  )
  const reads = await orders
    .listConversationReadsForParticipant(seller.customer_id)
    .catch(() => [])
  const readAtByConversation = new Map(
    reads.map((row) => [
      row.conversation_id,
      new Date(row.read_at).getTime(),
    ])
  )

  const statusFilter =
    typeof req.query?.status === "string" ? req.query.status.trim() : null
  const q = typeof req.query?.q === "string" ? req.query.q.trim() : ""

  let attention_count = 0
  let unread_count = 0
  const threads = []

  const customerModule = (() => {
    try {
      return req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
    } catch {
      return null
    }
  })()

  for (const conversation of conversations) {
    const messages = await orders.listOrderMessages(
      { conversation_id: conversation.id },
      { order: { created_at: "DESC" } }
    )
    const last = messages[0] ?? null
    const readAtMs = readAtByConversation.get(conversation.id) ?? null
    const unread = messages.some((message) => {
      if (message.sender_customer_id === seller.customer_id) return false
      if (readAtMs == null) return true
      return new Date(message.created_at).getTime() > readAtMs
    })
    const requires_attention = conversation.status === "waiting_for_seller"

    if (requires_attention) attention_count += 1
    if (unread) unread_count += 1

    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "open" || statusFilter === "action_required") {
        if (!requires_attention) continue
      } else if (statusFilter === "waiting_for_customer") {
        if (conversation.status !== "waiting_for_customer") continue
      } else if (statusFilter === "resolved") {
        if (conversation.status !== "resolved") continue
      } else if (conversation.status !== statusFilter) {
        continue
      }
    }

    let order_number: string | null = null
    if (conversation.order_id) {
      try {
        const order = await orders.retrieveEmOrder(conversation.order_id)
        order_number = order.order_number
      } catch {
        order_number = null
      }
    }

    let customer_email: string | null = null
    let customer_name: string | null = null
    if (customerModule) {
      try {
        const customer = await customerModule.retrieveCustomer(
          conversation.customer_id
        )
        customer_email = customer.email ?? null
        const name = [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(" ")
          .trim()
        customer_name = name || null
      } catch {
        // keep nulls
      }
    }

    const last_body_preview = last ? last.body.slice(0, 120) : null
    const hay = [
      customer_name ?? "",
      customer_email ?? "",
      conversation.customer_id,
      order_number ?? "",
      conversation.order_id ?? "",
      conversation.subject ?? "",
      last_body_preview ?? "",
    ].join(" ")
    if (!matchesQuery(hay, q)) continue

    threads.push({
      id: conversation.id,
      conversation_id: conversation.id,
      order_id: conversation.order_id,
      order_number,
      seller_id: conversation.seller_id,
      customer_id: conversation.customer_id,
      customer_email,
      customer_name,
      subject: conversation.subject,
      status: conversation.status,
      message_count: messages.length,
      last_message_at: conversation.last_message_at
        ? new Date(conversation.last_message_at).toISOString()
        : last?.created_at
          ? new Date(last.created_at).toISOString()
          : null,
      last_body_preview,
      unread,
      requires_attention,
    })
  }

  res.json({
    threads,
    count: threads.length,
    attention_count,
    unread_count,
  })
}
