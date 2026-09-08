import { model } from "@medusajs/framework/utils"

/**
 * Admin-managed advertising price rules.
 * placement + market_code + target_type combination → weekly price.
 * Fallback: if no specific rule, use placement-only rule (market_code = '*').
 */
const AdPricing = model
  .define("ad_pricing", {
    id: model.id({ prefix: "adpr" }).primaryKey(),
    placement: model.text(),
    market_code: model.text().default("*"),
    target_type: model.text().default("*"),
    weekly_price: model.bigNumber(),
    currency_code: model.text().default("EUR"),
    is_active: model.boolean().default(true),
  })
  .indexes([{ on: ["placement", "market_code", "target_type"] }])

export default AdPricing
