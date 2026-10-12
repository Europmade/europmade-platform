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
    /** Gepromote Product Cloud-product. */
    product_id: model.text().nullable(),
    /** Specifieke Commerce Cloud-offer. De commissie hoort bij deze offer. */
    offer_id: model.text().nullable(),
    /** Seller van die offer. */
    seller_id: model.text().nullable(),
    /** Totale affiliatecommissie in procentpunten, vastgelegd bij het maken van de link. */
    commission_percent_snapshot: model.float().nullable(),
    clicks: model.hasMany(() => Click, { mappedBy: "affiliate_link" }),
  })
  .indexes([{ on: ["affiliate_id"] }])

export default AffiliateLink
