import { model } from "@medusajs/framework/utils"

/**
 * ModerationCase — Blueprint `02-database-model.md` Deel B.13.
 * Eigen module (11-medusa-architecture.md §3). Geen matching-case-type
 * (ADR-0007).
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
  })
  .indexes([
    { on: ["product_id"] },
    { on: ["seller_id"] },
    { on: ["status"] },
  ])

export default ModerationCase
