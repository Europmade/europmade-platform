import { model } from "@medusajs/framework/utils"
import OrderMessage from "./message"

/** Attachment on an order_message — private/public file URL + metadata. */
const OrderMessageAttachment = model
  .define("order_message_attachment", {
    id: model.id({ prefix: "omatt" }).primaryKey(),
    message: model.belongsTo(() => OrderMessage, {
      mappedBy: "attachments",
      foreignKeyName: "message_id",
    }),
    file_id: model.text().nullable(),
    url: model.text(),
    filename: model.text(),
    mime_type: model.text(),
    size_bytes: model.number(),
  })
  .indexes([{ on: ["message_id"] }])

export default OrderMessageAttachment
