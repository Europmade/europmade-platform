import { model } from "@medusajs/framework/utils"

/**
 * Homepage CMS document — singleton via document_key = "default".
 * Payload mirrors storefront HomepageCmsDocument (+ SEO).
 */
const CmsHomepage = model
  .define("cms_homepage", {
    id: model.id({ prefix: "cmshp" }).primaryKey(),
    document_key: model.text().default("default"),
    /** Full homepage CMS JSON (hero, sections, …). */
    document: model.json(),
    seo_title: model.json().nullable(),
    seo_description: model.json().nullable(),
    seo_canonical: model.text().nullable(),
    og_title: model.json().nullable(),
    og_description: model.json().nullable(),
    published: model.boolean().default(false),
  })
  .indexes([{ on: ["document_key"], unique: true }])

export default CmsHomepage
