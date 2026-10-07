import { model } from "@medusajs/framework/utils"
import CommunicationTemplateVariant from "./template-variant"

/**
 * TemplateVersion — immutable communicatie-inhoud (ADR-0047).
 * Inhoud wijzigt niet. Een gebruikte version (`used_at`) wijzigt ook de status niet.
 * P0 verzendt deze rijen niet.
 */
const CommunicationTemplateVersion = model
  .define("communication_template_version", {
    id: model.id({ prefix: "ctver" }).primaryKey(),
    variant: model.belongsTo(() => CommunicationTemplateVariant, {
      mappedBy: "versions",
      foreignKeyName: "variant_id",
    }),
    version_number: model.number(),
    subject: model.text(),
    preheader: model.text(),
    body: model.text(),
    cta_label: model.text(),
    cta_url: model.text().nullable(),
    personalization_tokens: model.json(),
    approval_status: model
      .enum(["draft", "pending_review", "approved", "rejected"])
      .default("draft"),
    activation_status: model
      .enum(["inactive", "active", "archived"])
      .default("inactive"),
    approved_at: model.dateTime().nullable(),
    approved_by: model.text().nullable(),
    /** Gezet wanneer een latere history-stap de version gebruikt. Geen verzending. */
    used_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["variant_id", "version_number"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["variant_id"] },
    { on: ["approval_status"] },
    { on: ["activation_status"] },
  ])

export default CommunicationTemplateVersion
