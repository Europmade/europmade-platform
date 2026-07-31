import { model } from "@medusajs/framework/utils"

/**
 * ModerationCase — Blueprint `02-database-model.md` Deel B.13.
 * Soft-velden voor S3-03-07/S3-07-06 (signal_code, affiliate, besluit).
 */
const ModerationCase = model
  .define("moderation_case", {
    id: model.id({ prefix: "mcase" }).primaryKey(),
    product_id: model.text().nullable(),
    seller_id: model.text().nullable(),
    case_type: model.enum([
      "Fraude-signaal",
      "Melding derde partij",
      "Hoog-risico wijziging",
    ]),
    status: model.enum(["Gesignaleerd", "Geen actie", "Geëscaleerd"]),
    ai_metadata_id: model.text().nullable(),
    signal_code: model.text().nullable(),
    affiliate_id: model.text().nullable(),
    subject_customer_id: model.text().nullable(),
    source_entity_type: model.text().nullable(),
    source_entity_id: model.text().nullable(),
    decision_reason: model.text().nullable(),
    decided_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["product_id"] },
    { on: ["seller_id"] },
    { on: ["status"] },
    { on: ["case_type"] },
    { on: ["affiliate_id"] },
    { on: ["signal_code"] },
  ])

export default ModerationCase
