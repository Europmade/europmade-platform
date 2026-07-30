import { model } from "@medusajs/framework/utils"

/**
 * MergeRecord — Blueprint `02-database-model.md` Deel B.12.
 */
const MergeRecord = model.define("merge_record", {
  id: model.id({ prefix: "mrg" }).primaryKey(),
  surviving_product_id: model.text(),
  merged_product_id: model.text(),
  match_candidate_id: model.text().nullable(),
  performed_at: model.dateTime(),
})

export default MergeRecord
