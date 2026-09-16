import { model } from "@medusajs/framework/utils"

/**
 * Line icon for a commercial storefront nav key (not pc_category, not a product).
 */
const CommercialNavIcon = model
  .define("cms_commercial_nav_icon", {
    id: model.id({ prefix: "cmnic" }).primaryKey(),
    category_key: model.text(),
    storage_reference: model.text(),
  })
  .indexes([{ on: ["category_key"], unique: true }])

export default CommercialNavIcon
