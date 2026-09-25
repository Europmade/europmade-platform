import { model } from "@medusajs/framework/utils"
import Product from "./product"

/**
 * ChangeProposal — ADR-0009 / marketplace-core §19 / product-management Wijzigingsvoorstel-API.
 */
const ChangeProposal = model
  .define("change_proposal", {
    id: model.id({ prefix: "chpr" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "change_proposals",
      foreignKeyName: "product_id",
    }),
    submitter_seller_id: model.text(),
    proposed_title: model.text().nullable(),
    proposed_description: model.text().nullable(),
    /**
     * Structured central-field proposals (JSON).
     * Shape: { changes: [{ field, label, current_value, proposed_value, attribute_definition_id? }] }
     * Legacy title/description columns remain for backward compatibility.
     */
    proposed_fields: model.json().nullable(),
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
