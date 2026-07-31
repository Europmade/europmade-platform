import { model } from "@medusajs/framework/utils"
import Affiliate from "./affiliate"
import Click from "./click"

/**
 * affiliate_link — Blueprint Deel G.3.
 */
const AffiliateLink = model
  .define("affiliate_link", {
    id: model.id({ prefix: "alink" }).primaryKey(),
    affiliate: model.belongsTo(() => Affiliate, {
      mappedBy: "links",
      foreignKeyName: "affiliate_id",
    }),
    target_url: model.text(),
    tracking_param: model.text().unique(),
    clicks: model.hasMany(() => Click, { mappedBy: "affiliate_link" }),
  })
  .indexes([{ on: ["affiliate_id"] }])

export default AffiliateLink
