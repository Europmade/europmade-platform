import { model } from "@medusajs/framework/utils"

/**
 * AI category proposal. Not a draft and not a publication.
 * Rows are never written into cms_category.draft_document.
 */
const CmsCategoryProposal = model
  .define("cms_category_proposal", {
    id: model.id({ prefix: "cmscp" }).primaryKey(),
    category_slug: model.text(),
    category_id: model.text(),
    profile: model.enum(["level_1", "level_2", "level_3"]),
    block_id: model.text(),
    block_type: model.text(),
    fact_fingerprint: model.text(),
    status: model.enum(["proposed", "accepted", "modified", "rejected", "outdated"]),
    confidence: model.enum(["blocked", "partial", "factual"]),
    generation_reason: model.text(),
    used_facts: model.json(),
    missing: model.json(),
    missing_locales: model.json(),
    content: model.json().nullable(),
    provider_id: model.text(),
    model_name: model.text().nullable(),
    prompt_version: model.text(),
    locale_source: model.text().default("nl"),
    generated_at: model.dateTime(),
    applied_draft_revision: model.number().nullable(),
  })
  .indexes([
    { on: ["category_slug", "profile", "block_type", "fact_fingerprint"], unique: true },
    { on: ["category_slug", "status"] },
  ])

export default CmsCategoryProposal
