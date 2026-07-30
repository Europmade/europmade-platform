import { model } from "@medusajs/framework/utils"
import Product from "./product"

/**
 * OwnershipRecord — Blueprint `02-database-model.md` Deel B.9.
 * Append-only eigendomshistorie; `valid_until` null = huidige eigenaar.
 */
const OwnershipRecord = model
  .define("ownership_record", {
    id: model.id({ prefix: "ownr" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "ownership_records",
      foreignKeyName: "product_id",
    }),
    seller_id: model.text(),
    valid_from: model.dateTime(),
    valid_until: model.dateTime().nullable(),
    transfer_reason: model.text().nullable(),
  })
  .indexes([
    { on: ["product_id"] },
    { on: ["seller_id"] },
    { on: ["valid_from"] },
    { on: ["valid_until"] },
  ])

export default OwnershipRecord
