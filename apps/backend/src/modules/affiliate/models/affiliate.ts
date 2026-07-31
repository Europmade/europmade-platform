import { model } from "@medusajs/framework/utils"
import AffiliateLink from "./affiliate-link"
import Coupon from "./coupon"

/**
 * affiliate — Blueprint Deel G.2 (ADR-0029/0030).
 */
const Affiliate = model
  .define("affiliate", {
    id: model.id({ prefix: "aff" }).primaryKey(),
    customer_id: model.text().unique(),
    company_id: model.text().nullable(),
    onboarding_status: model.enum([
      "Ingediend",
      "In beoordeling",
      "Goedgekeurd",
      "Afgekeurd",
    ]),
    approved_at: model.dateTime().nullable(),
    channel_url: model.text().nullable(),
    rejection_reason: model.text().nullable(),
    links: model.hasMany(() => AffiliateLink, { mappedBy: "affiliate" }),
    coupons: model.hasMany(() => Coupon, { mappedBy: "affiliate" }),
  })
  .indexes([{ on: ["onboarding_status"] }, { on: ["company_id"] }])

export default Affiliate
