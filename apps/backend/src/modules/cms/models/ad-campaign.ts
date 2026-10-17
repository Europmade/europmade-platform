import { model } from "@medusajs/framework/utils"

/**
 * Paid advertising campaign booked by a seller.
 * Each row = one placement+target+market combination per week-set.
 * Availability is enforced server-side via unique constraint on
 * (placement, target_type, target_value, market_code, week_start).
 */
const AdCampaign = model
  .define("ad_campaign", {
    id: model.id({ prefix: "adcmp" }).primaryKey(),
    seller_id: model.text(),
    name: model.text(),
    placement: model.text(),
    target_type: model.text(),
    target_value: model.text().nullable(),
    markets: model.json().default([]),
    image_url: model.text().nullable(),
    logo_url: model.text().nullable(),
    banner_presentation: model.json().nullable(),
    destination_url: model.text(),
    headline: model.text().nullable(),
    subline: model.text().nullable(),
    cta_key: model.text().default("view_product"),
    design_key: model.text().default("design_1"),
    product_ids: model.json().default([]),
    campaign_slug: model.text().nullable(),
    seller_public_slug: model.text().nullable(),
    status: model.text().default("draft"),
    total_price: model.bigNumber().default(0),
    admin_note: model.text().nullable(),
  })
  .indexes([
    { on: ["seller_id"] },
    { on: ["status"] },
    { on: ["placement"] },
    { on: ["seller_public_slug", "campaign_slug"] },
  ])

export default AdCampaign
