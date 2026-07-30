import { model } from "@medusajs/framework/utils"
import Product from "./product"

/**
 * SplitRecord — Blueprint `02-database-model.md` Deel B.12.
 */
const SplitRecord = model.define("split_record", {
  id: model.id({ prefix: "splt" }).primaryKey(),
  original_product: model.belongsTo(() => Product, {
    mappedBy: "split_records_original",
    foreignKeyName: "original_product_id",
  }),
  new_product: model.belongsTo(() => Product, {
    mappedBy: "split_records_new",
    foreignKeyName: "new_product_id",
  }),
  performed_at: model.dateTime(),
})

export default SplitRecord
