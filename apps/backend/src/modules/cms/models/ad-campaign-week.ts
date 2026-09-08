import { model } from "@medusajs/framework/utils"

/**
 * Individual week booking for an ad campaign.
 * The unique constraint (placement, target_type, target_value, market_code, week_start)
 * prevents double-booking at the database level.
 */
const AdCampaignWeek = model
  .define("ad_campaign_week", {
    id: model.id({ prefix: "adwk" }).primaryKey(),
    campaign_id: model.text(),
    placement: model.text(),
    target_type: model.text(),
    target_value: model.text().nullable(),
    market_code: model.text(),
    week_start: model.dateTime(),
    week_end: model.dateTime(),
    week_price: model.bigNumber().default(0),
  })
  .indexes([
    { on: ["campaign_id"] },
    { on: ["placement", "market_code", "week_start"] },
  ])

export default AdCampaignWeek
