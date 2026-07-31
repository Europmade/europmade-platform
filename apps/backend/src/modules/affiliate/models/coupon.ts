import { model } from "@medusajs/framework/utils"
import Affiliate from "./affiliate"

/**
 * coupon — Blueprint Deel G.1 (attributie-only, geen Medusa Promotion).
 */
const Coupon = model
  .define("aff_coupon", {
    id: model.id({ prefix: "acpn" }).primaryKey(),
    affiliate: model.belongsTo(() => Affiliate, {
      mappedBy: "coupons",
      foreignKeyName: "affiliate_id",
    }),
    code: model.text().unique(),
    status: model.enum(["Actief", "Ingetrokken"]),
  })
  .indexes([{ on: ["affiliate_id"] }, { on: ["status"] }])

export default Coupon
