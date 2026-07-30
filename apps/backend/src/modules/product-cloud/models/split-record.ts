import { model } from "@medusajs/framework/utils"

/**
 * SplitRecord — Blueprint `02-database-model.md` Deel B.12.
 */
const SplitRecord = model.define("split_record", {
  id: model.id({ prefix: "splt" }).primaryKey(),
  original_product_id: model.text(),
  new_product_id: model.text(),
  performed_at: model.dateTime(),
})

export default SplitRecord
