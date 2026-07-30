import { model } from "@medusajs/framework/utils"
import Product from "./product"

/**
 * Claim — Blueprint `02-database-model.md` Deel B.10.
 * `ai_metadata_id` nullable tot S3-09-01 (geen harde FK).
 */
const Claim = model
  .define("claim", {
    id: model.id({ prefix: "clm" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "claims",
      foreignKeyName: "product_id",
    }),
    claimant_seller_id: model.text(),
    status: model.enum(["In beoordeling", "Goedgekeurd", "Afgewezen"]),
    ai_metadata_id: model.text().nullable(),
  })
  .indexes([{ on: ["product_id"] }, { on: ["status"] }])

export default Claim
