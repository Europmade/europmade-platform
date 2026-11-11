import { model } from "@medusajs/framework/utils"

/**
 * Redactionele content per canonieke pc_category.slug.
 * Productlisting blijft Product Cloud; dit is alleen CMS-laag.
 *
 * Published/Draft-scheiding: docs/10-implementation/category-cms-published-draft.md
 * Legacy kolommen `document` + `published` blijven tot latere cutover (stap 10).
 */
const CmsCategory = model
  .define("cms_category", {
    id: model.id({ prefix: "cmsca" }).primaryKey(),
    category_slug: model.text(),
    /** @deprecated Legacy — gebruik published_document / draft_document */
    document: model.json().default({}),
    /** @deprecated Legacy — afgeleid van published_document != null */
    published: model.boolean().default(false),
    i18n_meta: model.json().nullable(),
    published_document: model.json().nullable(),
    published_at: model.dateTime().nullable(),
    published_by: model.text().nullable(),
    published_version: model.number().default(0),
    published_note: model.text().nullable(),
    draft_document: model.json().nullable(),
    draft_updated_at: model.dateTime().nullable(),
    draft_updated_by: model.text().nullable(),
    draft_base_version: model.number().nullable(),
    draft_revision: model.number().default(0),
    draft_sync_state: model
      .enum(["absent", "in_sync", "unpublished_changes"])
      .default("absent"),
    legacy_migrated_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["category_slug"], unique: true },
    { on: ["published"] },
    { on: ["draft_sync_state"] },
  ])

export default CmsCategory
