import { model } from "@medusajs/framework/utils"
import CommunicationTemplate from "./communication-template"
import CommunicationTemplateVersion from "./template-version"

/**
 * TemplateVariant — redactionele identiteit per locale (ADR-0047).
 * Geen subject, body of approval; die staan op de version.
 */
const CommunicationTemplateVariant = model
  .define("communication_template_variant", {
    id: model.id({ prefix: "ctvar" }).primaryKey(),
    template: model.belongsTo(() => CommunicationTemplate, {
      mappedBy: "variants",
      foreignKeyName: "template_id",
    }),
    name: model.text(),
    locale: model.text(),
    versions: model.hasMany(() => CommunicationTemplateVersion, {
      mappedBy: "variant",
    }),
  })
  .indexes([
    {
      on: ["template_id", "name"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["template_id"] },
    { on: ["locale"] },
  ])

export default CommunicationTemplateVariant
