import { model } from "@medusajs/framework/utils"
import OrderMessage from "./message"

/**
 * Conversation thread — action status separate from read/unread.
 * order_id optional so seller can message a customer without an order link
 * (product requirement; ADR-0025 still covers order-linked threads).
 */
const EmConversation = model
  .define("em_conversation", {
    id: model.id({ prefix: "oconv" }).primaryKey(),
    seller_id: model.text(),
    customer_id: model.text(),
    order_id: model.text().nullable(),
    subject: model.text().nullable(),
    status: model.enum([
      "waiting_for_seller",
      "waiting_for_customer",
      "resolved",
    ]),
    last_message_at: model.dateTime().nullable(),
    messages: model.hasMany(() => OrderMessage, {
      mappedBy: "conversation",
    }),
  })
  .indexes([
    { on: ["seller_id"] },
    { on: ["customer_id"] },
    { on: ["order_id"] },
    { on: ["status"] },
    { on: ["seller_id", "status"] },
  ])

export default EmConversation
