import { model } from "@medusajs/framework/utils"
import EmOrder from "./em-order"
import EmReturn from "./em-return"

/**
 * order_line — Blueprint Deel D.3. Soft refs variant/offer (ADR-0021).
 */
const OrderLine = model
  .define("order_line", {
    id: model.id({ prefix: "olin" }).primaryKey(),
    order: model.belongsTo(() => EmOrder, {
      mappedBy: "lines",
      foreignKeyName: "order_id",
    }),
    product_variant_id: model.text(),
    offer_id: model.text(),
    quantity: model.number(),
    unit_price_snapshot: model.bigNumber(),
    vat_rate_snapshot: model.float(),
    returns: model.hasMany(() => EmReturn, {
      mappedBy: "order_line",
    }),
  })
  .indexes([{ on: ["order_id"] }, { on: ["offer_id"] }])

export default OrderLine
