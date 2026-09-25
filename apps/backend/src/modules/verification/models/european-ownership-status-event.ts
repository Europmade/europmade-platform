import { model } from "@medusajs/framework/utils"

/**
 * Append-only audit trail for european_ownership_claim decisions.
 */
const EuropeanOwnershipStatusEvent = model
  .define("european_ownership_status_event", {
    id: model.id({ prefix: "euose" }).primaryKey(),
    claim_id: model.text(),
    brand_id: model.text().nullable(),
    manufacturer_id: model.text().nullable(),
    from_status: model.text().nullable(),
    to_status: model.text(),
    note: model.text().nullable(),
    actor_id: model.text().nullable(),
    /** seller | admin */
    actor_type: model.text().nullable(),
    decision: model.text().nullable(),
  })
  .indexes([
    { on: ["claim_id"] },
    { on: ["brand_id"] },
    { on: ["manufacturer_id"] },
  ])

export default EuropeanOwnershipStatusEvent
