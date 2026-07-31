import { model } from "@medusajs/framework/utils"
import AffiliateLink from "./affiliate-link"

/**
 * click — Blueprint Deel G.4; vereist consent_record_id (ADR-0029).
 */
const Click = model
  .define("aff_click", {
    id: model.id({ prefix: "aclk" }).primaryKey(),
    affiliate_link: model.belongsTo(() => AffiliateLink, {
      mappedBy: "clicks",
      foreignKeyName: "affiliate_link_id",
    }),
    consent_record_id: model.text(),
    attribution_expires_at: model.dateTime(),
  })
  .indexes([
    { on: ["affiliate_link_id"] },
    { on: ["consent_record_id"] },
    { on: ["attribution_expires_at"] },
  ])

export default Click
