import { model } from "@medusajs/framework/utils"

/** Cost of one proposal generation for one locale. Offline rows store 0. */
const CmsCategoryProposalCost = model
  .define("cms_category_proposal_cost", {
    id: model.id({ prefix: "cmscc" }).primaryKey(),
    proposal_id: model.text(),
    category_slug: model.text(),
    block_type: model.text(),
    locale: model.enum(["nl", "en", "de", "fr"]),
    provider_id: model.text(),
    model_name: model.text().nullable(),
    input_tokens: model.number().nullable(),
    output_tokens: model.number().nullable(),
    currency: model.text().nullable(),
    amount_minor: model.number().nullable(),
    generated_at: model.dateTime(),
  })
  .indexes([{ on: ["proposal_id"] }, { on: ["category_slug"] }])

export default CmsCategoryProposalCost
