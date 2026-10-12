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
    /** Bestaande mijlpaal die deze automatisering start. Leeg = start niet vanzelf. */
    start_trigger: model.text().nullable(),
    /** event, condition of scheduled. */
    start_mode: model.text().nullable(),
    scheduled_at: model.text().nullable(),
    schedule_timezone: model.text().nullable(),
    audience: model.text().nullable(),
    /** concept start niet. active mag door de job worden opgepakt. Er wordt niets verzonden. */
    activation_status: model.text().nullable(),
    /**
     * Vastgelegde selectie van een nieuwsbrief of campagne.
     * Taal, en waar de koppeling bestaat product, merk en categorie.
     */
    selection_criteria: model.json().nullable(),
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
