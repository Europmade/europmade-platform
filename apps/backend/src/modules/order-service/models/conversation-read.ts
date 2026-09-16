import { model } from "@medusajs/framework/utils"

/**
 * Per-participant read cursor for a conversation (`em_conversation.id`).
 * Separate from conversation action status (waiting_for_* / resolved).
 */
const OrderConversationRead = model
  .define("order_conversation_read", {
    id: model.id({ prefix: "ocr" }).primaryKey(),
    participant_customer_id: model.text(),
    conversation_id: model.text(),
    read_at: model.dateTime(),
  })
  .indexes([
    {
      on: ["participant_customer_id", "conversation_id"],
      unique: true,
    },
    { on: ["participant_customer_id"] },
    { on: ["conversation_id"] },
  ])

export default OrderConversationRead
