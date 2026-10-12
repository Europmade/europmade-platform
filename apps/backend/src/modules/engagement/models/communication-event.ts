import { model } from "@medusajs/framework/utils"
import EngagementContact from "./contact"
import EngagementEnrollment from "./enrollment"

/**
 * CommunicationEvent — history van een send of stop.
 * `template_version_id` legt later de gebruikte version vast.
 * SequenceStep blijft zonder version-id. P0 maakt deze rijen niet automatisch
 * en verzendt niet.
 */
const EngagementCommunicationEvent = model
  .define("engagement_communication_event", {
    id: model.id({ prefix: "ecev" }).primaryKey(),
    contact: model
      .belongsTo(() => EngagementContact, {
        mappedBy: "communication_events",
        foreignKeyName: "contact_id",
      })
      .nullable(),
    organization_id: model.text().nullable(),
    /** Soft ref. Geen FK naar Medusa Customer. */
    customer_id: model.text().nullable(),
    /**
     * Soft ref naar engagement_consumer voor latere nieuwsbriefhistorie.
     * P1 schrijft hier nog geen verzending naartoe.
     */
    consumer_id: model.text().nullable(),
    affiliate_id: model.text().nullable(),
    enrollment: model
      .belongsTo(() => EngagementEnrollment, {
        mappedBy: "communication_events",
        foreignKeyName: "enrollment_id",
      })
      .nullable(),
    program_id: model.text().nullable(),
    sequence_id: model.text().nullable(),
    sequence_step_id: model.text().nullable(),
    template_id: model.text().nullable(),
    variant_id: model.text().nullable(),
    template_version_id: model.text().nullable(),
    /** Gereserveerd soft ref. P0 vult dit niet vanuit AI. */
    ai_draft_id: model.text().nullable(),
    status: model.enum(["queued", "sent", "failed", "bounced", "stopped"]),
    provider_message_id: model.text().nullable(),
    /** Taal van de gebruikte variant. Leeg tot de rij die taal kent. */
    locale: model.text().nullable(),
    /** Fout van een latere provider. Dry-run vult dit niet. */
    delivery_error: model.text().nullable(),
    attempt_count: model.number().default(0),
    /** Open claim. Een geclaimde rij wordt niet nog eens aangeboden. */
    delivery_claim: model.text().nullable(),
    replied: model.boolean().default(false),
    bounced: model.boolean().default(false),
    unsubscribed: model.boolean().default(false),
  })
  .indexes([
    { on: ["contact_id"] },
    { on: ["consumer_id"] },
    { on: ["enrollment_id"] },
    { on: ["status"] },
    { on: ["template_version_id"] },
  ])

export default EngagementCommunicationEvent
