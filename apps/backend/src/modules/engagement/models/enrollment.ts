import { model } from "@medusajs/framework/utils"
import EngagementContact from "./contact"
import EngagementOrganization from "./organization"
import EngagementLifecycleProgram from "./lifecycle-program"
import EngagementSequence from "./sequence"
import EngagementSequenceStep from "./sequence-step"
import EngagementCommunicationEvent from "./communication-event"

/**
 * Enrollment — deelname van een contact aan een programma.
 * `program_type` staat ook op de rij zodat de active-uniekheid een partial unique index kan zijn.
 * `next_step_at` hoort hier, niet op SequenceStep. Geen verzending.
 */
const EngagementEnrollment = model
  .define("engagement_enrollment", {
    id: model.id({ prefix: "eenr" }).primaryKey(),
    contact: model
      .belongsTo(() => EngagementContact, {
        mappedBy: "enrollments",
        foreignKeyName: "contact_id",
      })
      .nullable(),
    organization: model
      .belongsTo(() => EngagementOrganization, {
        mappedBy: "enrollments",
        foreignKeyName: "organization_id",
      })
      .nullable(),
    /** Consument of affiliate, als er geen zakelijk contact is. */
    consumer_id: model.text().nullable(),
    affiliate_id: model.text().nullable(),
    program: model.belongsTo(() => EngagementLifecycleProgram, {
      mappedBy: "enrollments",
      foreignKeyName: "program_id",
    }),
    sequence: model.belongsTo(() => EngagementSequence, {
      mappedBy: "enrollments",
      foreignKeyName: "sequence_id",
    }),
    current_step: model.belongsTo(() => EngagementSequenceStep, {
      mappedBy: "enrollments",
      foreignKeyName: "sequence_step_id",
    }),
    program_type: model.enum([
      "acquisition",
      "onboarding",
      "lifecycle",
      "newsletter",
      "campaign",
      "operational",
    ]),
    /**
     * human_follow_up stopt automatische vervolgstappen.
     * Geen Crisp-conversatie, geen mailbox en geen communication event.
     * Crisp is later de externe handover-laag.
     */
    status: model
      .enum([
        "active",
        "stopped",
        "completed",
        "human_follow_up",
        "suppressed",
      ])
      .default("active"),
    next_step_at: model.dateTime().nullable(),
    entry_source: model.text(),
    trigger_key: model.text(),
    communication_events: model.hasMany(() => EngagementCommunicationEvent, {
      mappedBy: "enrollment",
    }),
  })
  .indexes([
    { on: ["contact_id"] },
    { on: ["organization_id"] },
    { on: ["program_id"] },
    { on: ["sequence_id"] },
    { on: ["sequence_step_id"] },
    { on: ["status"] },
    {
      on: ["contact_id", "trigger_key"],
      unique: true,
      where: "contact_id IS NOT NULL AND deleted_at IS NULL",
    },
    {
      on: ["consumer_id", "trigger_key"],
      unique: true,
      where: "consumer_id IS NOT NULL AND deleted_at IS NULL",
    },
    {
      on: ["affiliate_id", "trigger_key"],
      unique: true,
      where: "affiliate_id IS NOT NULL AND deleted_at IS NULL",
    },
    {
      on: ["consumer_id", "program_type"],
      unique: true,
      where: "consumer_id IS NOT NULL AND status = 'active' AND deleted_at IS NULL",
    },
    {
      on: ["affiliate_id", "program_type"],
      unique: true,
      where: "affiliate_id IS NOT NULL AND status = 'active' AND deleted_at IS NULL",
    },
    {
      on: ["contact_id", "program_type"],
      unique: true,
      where: "status = 'active' AND deleted_at IS NULL",
    },
    {
      on: ["contact_id"],
      unique: true,
      where:
        "status = 'active' AND program_type IN ('acquisition', 'onboarding') AND deleted_at IS NULL",
    },
  ])

export default EngagementEnrollment
