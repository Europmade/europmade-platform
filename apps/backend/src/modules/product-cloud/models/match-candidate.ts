import { model } from "@medusajs/framework/utils"
import Product from "./product"
import MergeRecord from "./merge-record"

/**
 * MatchCandidate — Blueprint `02-database-model.md` Deel B.11.
 * Order-onafhankelijke uniciteit: applicatie schrijft altijd
 * product_id_a < product_id_b (lexicografisch).
 */
const MatchCandidate = model
  .define("match_candidate", {
    id: model.id({ prefix: "mtch" }).primaryKey(),
    product_a: model.belongsTo(() => Product, {
      mappedBy: "match_candidates_a",
      foreignKeyName: "product_id_a",
    }),
    product_b: model.belongsTo(() => Product, {
      mappedBy: "match_candidates_b",
      foreignKeyName: "product_id_b",
    }),
    status: model.enum(["Kandidaat", "Merge uitgevoerd", "Geen actie"]),
    ai_metadata_id: model.text().nullable(),
    merge_records: model.hasMany(() => MergeRecord, {
      mappedBy: "match_candidate",
    }),
  })
  .indexes([
    {
      on: ["product_id_a", "product_id_b"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["product_id_a"] },
    { on: ["product_id_b"] },
    { on: ["status"] },
  ])

export default MatchCandidate
