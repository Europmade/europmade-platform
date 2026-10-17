import { model } from "@medusajs/framework/utils"

/**
 * Redactionele CMS-banner (geen betaald booking).
 * market_scope: all | selected; markets: ISO EU-27 codes JSON array.
 */
const CmsBanner = model
  .define("cms_banner", {
    id: model.id({ prefix: "cmsbn" }).primaryKey(),
    position: model.number().default(1),
    location: model.text().default("homepage"),
    title: model.json(),
    subtitle: model.json(),
    cta_label: model.json(),
    destination_url: model.text(),
    link_type: model.text().default("category"),
    image_url: model.text().nullable(),
    image_alt: model.json(),
    background: model.text().nullable(),
    logo_url: model.text().nullable(),
    presentation: model.json().nullable(),
    market_scope: model.text().default("all"),
    markets: model.json().default([]),
    visible: model.boolean().default(true),
    sort_order: model.number().default(0),
    publish_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    published: model.boolean().default(false),
    asset_id: model.text().nullable(),
    i18n_meta: model.json().nullable(),
  })
  .indexes([
    { on: ["location", "position"] },
    { on: ["published"] },
  ])

export default CmsBanner
