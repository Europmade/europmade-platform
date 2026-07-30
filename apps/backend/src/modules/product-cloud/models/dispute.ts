import { model } from "@medusajs/framework/utils"
import Product from "./product"

/**
 * Dispute — Blueprint `02-database-model.md` Deel B.10.
 */
const Dispute = model
  .define("dispute", {
    id: model.id({ prefix: "dsp" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "disputes",
      foreignKeyName: "product_id",
    }),
    status: model.enum([
      "Open",
      "Bevestiging huidige eigenaar",
      "Overdracht",
      "Tijdelijke terugzetting",
    ]),
  })
  .indexes([{ on: ["product_id"] }, { on: ["status"] }])

export default Dispute
