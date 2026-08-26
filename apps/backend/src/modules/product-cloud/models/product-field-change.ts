import { model } from "@medusajs/framework/utils"
import Product from "./product"
import ProductVersion from "./product-version"

/**
 * Append-only product field change history (no silent overwrite).
 * status: pending → approved/rejected for moderation; current = applied on active concept.
 */
const ProductFieldChange = model
  .define("pc_field_change", {
    id: model.id({ prefix: "pfch" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "field_changes",
      foreignKeyName: "product_id",
    }),
    product_version: model
      .belongsTo(() => ProductVersion, {
        mappedBy: "field_changes",
        foreignKeyName: "product_version_id",
      })
      .nullable(),
    seller_id: model.text(),
    actor_customer_id: model.text().nullable(),
    field_code: model.text(),
    field_label: model.text(),
    old_value: model.text().nullable(),
    new_value: model.text().nullable(),
    status: model.enum(["current", "pending", "approved", "rejected"]),
    reason: model.text().nullable(),
  })
  .indexes([
    { on: ["product_id"] },
    { on: ["product_version_id"] },
    { on: ["seller_id"] },
    { on: ["field_code"] },
  ])

export default ProductFieldChange
