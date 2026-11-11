import { model } from "@medusajs/framework/utils"

/**
 * Append-only history of successful category CMS publications.
 * See docs/10-implementation/category-cms-published-draft.md
 */
const CmsCategoryRevision = model
  .define("cms_category_revision", {
    id: model.id({ prefix: "cmscr" }).primaryKey(),
    category_slug: model.text(),
    kind: model.enum(["publish", "restore_publish"]).default("publish"),
    version: model.number(),
    document: model.json(),
    superseded_document: model.json().nullable(),
    published_at: model.dateTime().nullable(),
    published_by: model.text().nullable(),
    note: model.text().nullable(),
    source: model
      .enum(["editor_publish", "restore_and_publish"])
      .default("editor_publish"),
    restored_from_version: model.number().nullable(),
  })
  .indexes([
    { on: ["category_slug"] },
    { on: ["category_slug", "version"], unique: true },
  ])

export default CmsCategoryRevision
