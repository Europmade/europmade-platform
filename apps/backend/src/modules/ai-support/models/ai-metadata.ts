import { model } from "@medusajs/framework/utils"

/**
 * F.1 ai_metadata — polymorfe AI-bijlage (ADR-0035 soft subject_*).
 */
const AiMetadata = model
  .define("ai_metadata", {
    id: model.id({ prefix: "aimeta" }).primaryKey(),
    recommendation_type: model.enum([
      "Matchvergelijking",
      "Consistentiecontrole",
      "Risicoclassificatie",
      "Fraude-signaal",
    ]),
    confidence_score: model.float(),
    explanation: model.text().nullable(),
    subject_type: model.text(),
    subject_id: model.text(),
  })
  .indexes([
    { on: ["subject_type", "subject_id"] },
    { on: ["recommendation_type"] },
  ])

export default AiMetadata
