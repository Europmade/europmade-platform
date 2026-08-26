import { model } from "@medusajs/framework/utils"

/**
 * Append-only audit trail for Made in Europe / origin verification status.
 */
const ProductOriginStatusEvent = model
  .define("product_origin_status_event", {
    id: model.id({ prefix: "pose" }).primaryKey(),
    product_id: model.text(),
    product_origin_id: model.text().nullable(),
    evidence_id: model.text().nullable(),
    from_status: model.text().nullable(),
    to_status: model.text(),
    note: model.text().nullable(),
    actor_customer_id: model.text().nullable(),
    actor_type: model.text().nullable(),
  })
  .indexes([{ on: ["product_id"] }, { on: ["product_origin_id"] }])

export default ProductOriginStatusEvent
