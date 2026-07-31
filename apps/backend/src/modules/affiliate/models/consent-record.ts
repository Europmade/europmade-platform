import { model } from "@medusajs/framework/utils"

/**
 * consent_record — Blueprint Deel G.10 (ADR-0029).
 */
const ConsentRecord = model
  .define("consent_record", {
    id: model.id({ prefix: "cnsnt" }).primaryKey(),
    visitor_hash: model.text(),
    consent_given: model.boolean(),
  })
  .indexes([{ on: ["visitor_hash"] }, { on: ["created_at"] }])

export default ConsentRecord
