import { model } from "@medusajs/framework/utils"
import Product from "./product"
import MatchCandidate from "./match-candidate"

/**
 * MergeRecord — Blueprint `02-database-model.md` Deel B.12.
 */
const MergeRecord = model.define("merge_record", {
  id: model.id({ prefix: "mrg" }).primaryKey(),
  surviving_product: model.belongsTo(() => Product, {
    mappedBy: "merge_records_surviving",
    foreignKeyName: "surviving_product_id",
  }),
  merged_product: model.belongsTo(() => Product, {
    mappedBy: "merge_records_merged",
    foreignKeyName: "merged_product_id",
  }),
  match_candidate: model
    .belongsTo(() => MatchCandidate, {
      mappedBy: "merge_records",
      foreignKeyName: "match_candidate_id",
    })
    .nullable(),
  performed_at: model.dateTime(),
})

export default MergeRecord
