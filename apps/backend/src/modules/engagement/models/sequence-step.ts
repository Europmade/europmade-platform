import { model } from "@medusajs/framework/utils"
import EngagementSequence from "./sequence"
import EngagementEnrollment from "./enrollment"

/**
 * SequenceStep — volgorde, delay en id-verwijzing naar template + variant.
 * Geen subject, body, CTA, version-inhoud of next_step_at.
 * De Communication CMS-modellen blijven ongewijzigd; dit zijn id-verwijzingen.
 */
const EngagementSequenceStep = model
  .define("engagement_sequence_step", {
    id: model.id({ prefix: "estp" }).primaryKey(),
    sequence: model.belongsTo(() => EngagementSequence, {
      mappedBy: "steps",
      foreignKeyName: "sequence_id",
    }),
    step_order: model.number(),
    delay_minutes: model.number().default(0),
    template_id: model.text(),
    variant_id: model.text(),
    enrollments: model.hasMany(() => EngagementEnrollment, {
      mappedBy: "current_step",
    }),
  })
  .indexes([
    {
      on: ["sequence_id", "step_order"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["sequence_id"] },
    { on: ["template_id"] },
    { on: ["variant_id"] },
  ])

export default EngagementSequenceStep
