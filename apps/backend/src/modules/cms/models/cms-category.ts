import { model } from "@medusajs/framework/utils"

/**
 * Redactionele content per canonieke pc_category.slug.
 * Productlisting blijft Product Cloud; dit is alleen CMS-laag.
 */
const CmsCategory = model
  .define("cms_category", {
    id: model.id({ prefix: "cmsca" }).primaryKey(),
    category_slug: model.text(),
    document: model.json(),
    published: model.boolean().default(false),
    i18n_meta: model.json().nullable(),
  })
  .indexes([{ on: ["category_slug"], unique: true }, { on: ["published"] }])

export default CmsCategory
