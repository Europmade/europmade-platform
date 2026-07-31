import { model } from "@medusajs/framework/utils"

/**
 * Platformdefault affiliate-commissie (ADR-0030). Eén actieve rij.
 */
const AffiliateCommissionSetting = model.define("affiliate_commission_setting", {
  id: model.id({ prefix: "affcs" }).primaryKey(),
  percentage: model.float(),
  attribution_days: model.number(),
  is_active: model.boolean().default(true),
})

export default AffiliateCommissionSetting
