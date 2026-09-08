import { model } from "@medusajs/framework/utils"

/**
 * Redactionele CMS-laag per Product Cloud-product.
 * Geen duplicaat van SKU/prijs/Buy Box — alleen editorial.
 */
const CmsProduct = model
  .define("cms_product", {
    id: model.id({ prefix: "cmspr" }).primaryKey(),
    product_id: model.text(),
    document: model.json(),
    published: model.boolean().default(false),
    i18n_meta: model.json().nullable(),
  })
  .indexes([{ on: ["product_id"], unique: true }, { on: ["published"] }])

export default CmsProduct
