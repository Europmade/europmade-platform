import { model } from "@medusajs/framework/utils"

/**
 * ChangeProposal — ADR-0009 / marketplace-core §19 / product-management Wijzigingsvoorstel-API.
 */
const ChangeProposal = model
  .define("change_proposal", {
    id: model.id({ prefix: "chpr" }).primaryKey(),
    product_id: model.text(),
    submitter_seller_id: model.text(),
    proposed_title: model.text().nullable(),
    proposed_description: model.text().nullable(),
    toelichting: model.text(),
    status: model.enum(["In behandeling", "Goedgekeurd", "Afgewezen"]),
    decision_reason: model.text().nullable(),
    decided_by_seller_id: model.text().nullable(),
    decided_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["product_id"] },
    { on: ["submitter_seller_id"] },
    { on: ["status"] },
  ])

export default ChangeProposal
