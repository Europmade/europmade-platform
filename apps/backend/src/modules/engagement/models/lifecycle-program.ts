import { model } from "@medusajs/framework/utils"
import EngagementSequence from "./sequence"
import EngagementEnrollment from "./enrollment"

/**
 * LifecycleProgram — één model voor alle programmatypes.
 * Meerdere programma's per type zijn toegestaan. Geen tabel per type.
 * `growth` is geen type; groei valt onder `lifecycle`.
 */
const EngagementLifecycleProgram = model
  .define("engagement_lifecycle_program", {
    id: model.id({ prefix: "elpr" }).primaryKey(),
    name: model.text(),
    program_type: model.enum([
      "acquisition",
      "onboarding",
      "lifecycle",
      "newsletter",
      "campaign",
      "operational",
    ]),
    sequences: model.hasMany(() => EngagementSequence, {
      mappedBy: "program",
    }),
    enrollments: model.hasMany(() => EngagementEnrollment, {
      mappedBy: "program",
    }),
  })
  .indexes([
    { on: ["program_type"] },
    {
      on: ["program_type", "name"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default EngagementLifecycleProgram
