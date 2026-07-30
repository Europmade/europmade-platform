import { model } from "@medusajs/framework/utils"

/**
 * Configureerbare Buy Box-weging (ADR-0001 / ADR-0019).
 * Eén actieve rij (singleton via service); percentages als floats 0–1.
 */
const BuyBoxWeighting = model.define("buy_box_weighting", {
  id: model.id({ prefix: "bbw" }).primaryKey(),
  price: model.float(),
  delivery: model.float(),
  seller_review: model.float(),
  stock: model.float(),
  performance: model.float(),
  returns: model.float(),
})

export default BuyBoxWeighting
