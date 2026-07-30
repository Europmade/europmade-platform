import { model } from "@medusajs/framework/utils"

/**
 * MatchCandidate — Blueprint `02-database-model.md` Deel B.11.
 * Order-onafhankelijke uniciteit: applicatie schrijft altijd
 * product_id_a < product_id_b (lexicografisch).
 */
const MatchCandidate = model
  .define("match_candidate", {
    id: model.id({ prefix: "mtch" }).primaryKey(),
    product_id_a: model.text(),
    product_id_b: model.text(),
    status: model.enum(["Kandidaat", "Merge uitgevoerd", "Geen actie"]),
    ai_metadata_id: model.text().nullable(),
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
