import { model } from "@medusajs/framework/utils"

/**
 * Buy Box-cache — Blueprint `02-database-model.md` Deel C.4.
 * Soft refs naar identifier/offer (ADR-0015-patroon).
 */
const BuyBoxComputation = model
  .define("buy_box_computation", {
    id: model.id({ prefix: "bbx" }).primaryKey(),
    identifier_id: model.text(),
    region_code: model.text(),
    winning_offer_id: model.text(),
    computed_at: model.dateTime(),
  })
  .indexes([
    {
      on: ["identifier_id", "region_code"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_buy_box_computation_identifier_region_unique",
    },
    { on: ["identifier_id"] },
    { on: ["region_code"] },
    { on: ["winning_offer_id"] },
  ])

export default BuyBoxComputation
