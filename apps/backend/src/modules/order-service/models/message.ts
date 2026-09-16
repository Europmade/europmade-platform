import { model } from "@medusajs/framework/utils"
import EmOrder from "./em-order"
import EmConversation from "./conversation"
import OrderMessageAttachment from "./message-attachment"

/**
 * message — Blueprint Deel G.9 + conversation/attachments extension.
 */
const OrderMessage = model
  .define("order_message", {
    id: model.id({ prefix: "omsg" }).primaryKey(),
    conversation: model.belongsTo(() => EmConversation, {
      mappedBy: "messages",
      foreignKeyName: "conversation_id",
    }),
    order: model
      .belongsTo(() => EmOrder, {
        mappedBy: "messages",
        foreignKeyName: "order_id",
      })
      .nullable(),
    sender_customer_id: model.text(),
    body: model.text(),
    attachments: model.hasMany(() => OrderMessageAttachment, {
      mappedBy: "message",
    }),
  })
  .indexes([
    { on: ["conversation_id"] },
    { on: ["order_id"] },
    { on: ["sender_customer_id"] },
  ])

export default OrderMessage
