import { model } from "@medusajs/framework/utils"
import EmOrder from "./em-order"

/**
 * message — Blueprint Deel G.9 (Order-context only).
 */
const OrderMessage = model
  .define("order_message", {
    id: model.id({ prefix: "omsg" }).primaryKey(),
    order: model.belongsTo(() => EmOrder, {
      mappedBy: "messages",
      foreignKeyName: "order_id",
    }),
    sender_customer_id: model.text(),
    body: model.text(),
  })
  .indexes([{ on: ["order_id"] }, { on: ["sender_customer_id"] }])

export default OrderMessage
