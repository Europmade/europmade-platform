import { model } from "@medusajs/framework/utils"

/**
 * commission — Blueprint Deel G.6 (start Finance-module voor S3-07-03).
 */
const Commission = model
  .define("commission", {
    id: model.id({ prefix: "comm" }).primaryKey(),
    recipient_type: model.enum(["Platform", "Seller", "Affiliate"]),
    order_id: model.text().nullable(),
    conversion_id: model.text().nullable(),
    amount: model.bigNumber(),
    percentage: model.float(),
    status: model.enum(["Toegekend", "Teruggedraaid"]).default("Toegekend"),
  })
  .indexes([
    { on: ["order_id"] },
    { on: ["conversion_id"] },
    { on: ["recipient_type"] },
  ])

export default Commission
