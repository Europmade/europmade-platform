import { model } from "@medusajs/framework/utils"

/**
 * Snapshot of commercial storefront-nav order.
 * Updated at most once per 14 days. Not Product Cloud taxonomy.
 */
const CommercialNavRank = model.define("cms_commercial_nav_rank", {
  id: model.id({ prefix: "cmnav" }).primaryKey(),
  mode: model.text().default("product_count"),
  ordered_keys: model.json().default([]),
  visitor_counts: model.json().default({}),
  featured_product_ids: model.json().default({}),
  computed_at: model.dateTime().nullable(),
})

export default CommercialNavRank
