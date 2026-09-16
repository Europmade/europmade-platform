import { model } from "@medusajs/framework/utils"
import EmOrder from "./em-order"

/**
 * Seller-uploaded order documents (customer invoice / packing slip).
 * Not platform finance invoices (ADR-0034); see ADR-0040.
 */
const OrderDocument = model
  .define("order_document", {
    id: model.id({ prefix: "odoc" }).primaryKey(),
    order: model.belongsTo(() => EmOrder, {
      mappedBy: "documents",
      foreignKeyName: "order_id",
    }),
    type: model.enum(["invoice", "packing_slip"]),
    file_id: model.text().nullable(),
    url: model.text(),
    filename: model.text(),
    mime_type: model.text(),
    size_bytes: model.number(),
    uploaded_at: model.dateTime(),
  })
  .indexes([
    { on: ["order_id"] },
    {
      on: ["order_id", "type"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_order_document_order_id_type_unique",
    },
  ])

export default OrderDocument
