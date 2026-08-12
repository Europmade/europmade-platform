import { model } from "@medusajs/framework/utils"

/**
 * Land-specifieke merkcontent — één merk, meerdere markten.
 * `managed_by_company_id` verwijst naar de rechthebbende partij voor die markt.
 */
const BrandMarketContent = model
  .define("brand_market_content", {
    id: model.id({ prefix: "bmc" }).primaryKey(),
    brand_id: model.text(),
    country_code: model.text(),
    intro: model.text().nullable(),
    story: model.text().nullable(),
    contact_info: model.text().nullable(),
    managed_by_company_id: model.text().nullable(),
  })
  .indexes([
    { on: ["brand_id", "country_code"], unique: true },
    { on: ["managed_by_company_id"] },
  ])

export default BrandMarketContent
