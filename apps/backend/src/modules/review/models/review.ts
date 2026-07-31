import { model } from "@medusajs/framework/utils"

/**
 * review — Blueprint `02-database-model.md` Deel E.1 (ADR-0027).
 */
const Review = model
  .define("review", {
    id: model.id({ prefix: "rev" }).primaryKey(),
    customer_id: model.text(),
    order_line_id: model.text(),
    review_type: model.enum(["Productreview", "Verkopersreview"]),
    product_id: model.text().nullable(),
    seller_id: model.text().nullable(),
    score: model.number(),
    text: model.text().nullable(),
  })
  .indexes([
    {
      on: ["customer_id", "order_line_id", "review_type"],
      unique: true,
    },
    { on: ["product_id"] },
    { on: ["seller_id"] },
  ])

export default Review
