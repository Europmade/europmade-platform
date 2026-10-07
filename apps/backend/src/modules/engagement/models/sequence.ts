import { model } from "@medusajs/framework/utils"
import EngagementLifecycleProgram from "./lifecycle-program"
import EngagementSequenceStep from "./sequence-step"
import EngagementEnrollment from "./enrollment"

/**
 * Sequence — identiteit van een communicatiereeks binnen een LifecycleProgram.
 * Geen subject, body, CTA of andere inhoud.
 */
const EngagementSequence = model
  .define("engagement_sequence", {
    id: model.id({ prefix: "eseq" }).primaryKey(),
    program: model.belongsTo(() => EngagementLifecycleProgram, {
      mappedBy: "sequences",
      foreignKeyName: "program_id",
    }),
    name: model.text(),
    steps: model.hasMany(() => EngagementSequenceStep, {
      mappedBy: "sequence",
    }),
    enrollments: model.hasMany(() => EngagementEnrollment, {
      mappedBy: "sequence",
    }),
  })
  .indexes([
    { on: ["program_id"] },
    {
      on: ["program_id", "name"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default EngagementSequence
