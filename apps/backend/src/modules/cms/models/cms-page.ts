import { model } from "@medusajs/framework/utils"

/**
 * Statische CMS-pagina (about / landing content).
 */
const CmsPage = model
  .define("cms_page", {
    id: model.id({ prefix: "cmspg" }).primaryKey(),
    slug: model.text(),
    title: model.json(),
    body: model.json(),
    seo_title: model.json().nullable(),
    seo_description: model.json().nullable(),
    seo_canonical: model.text().nullable(),
    published: model.boolean().default(false),
    visible: model.boolean().default(true),
    sort_order: model.number().default(0),
    publish_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    /** Per-locale origin: source | machine | manual */
    i18n_meta: model.json().nullable(),
    cover_url: model.text().nullable(),
    /** Visuele secties (hero, tekst, FAQ, …). title/body blijven sync voor storefront. */
    document: model.json().default({}),
  })
  .indexes([{ on: ["slug"], unique: true }, { on: ["published"] }])

export default CmsPage
