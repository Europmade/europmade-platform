import { model } from "@medusajs/framework/utils"

/**
 * Anonymous commercial-category session (hashed). No IP/UA/PII.
 * Unique per session_hash + category_key + calendar day.
 */
const CommercialNavVisit = model
  .define("cms_commercial_nav_visit", {
    id: model.id({ prefix: "cmnvt" }).primaryKey(),
    session_hash: model.text(),
    category_key: model.text(),
    visited_on: model.text(),
  })
  .indexes([
    { on: ["session_hash", "category_key", "visited_on"], unique: true },
    { on: ["visited_on"] },
    { on: ["category_key"] },
  ])

export default CommercialNavVisit
