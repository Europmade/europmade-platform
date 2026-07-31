import { model } from "@medusajs/framework/utils"

/**
 * conversion — Blueprint Deel G.5; soft ref order_id → em_order.
 */
const Conversion = model
  .define("aff_conversion", {
    id: model.id({ prefix: "acnv" }).primaryKey(),
    order_id: model.text().unique(),
    click_id: model.text().nullable(),
    coupon_id: model.text().nullable(),
    affiliate_id: model.text(),
    reversed_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["click_id"] },
    { on: ["coupon_id"] },
    { on: ["affiliate_id"] },
  ])

export default Conversion
