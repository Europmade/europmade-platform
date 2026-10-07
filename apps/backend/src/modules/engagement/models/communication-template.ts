import { model } from "@medusajs/framework/utils"
import CommunicationTemplateVariant from "./template-variant"

/**
 * CommunicationTemplate — alleen stabiele identiteit (ADR-0047).
 * Geen subject, body, locale, tokens of approval.
 */
const CommunicationTemplate = model
  .define("communication_template", {
    id: model.id({ prefix: "ctpl" }).primaryKey(),
    name: model.text(),
    communication_type: model.enum([
      "acquisition",
      "onboarding",
      "lifecycle",
      "newsletter",
      "campaign",
      "operational",
    ]),
    /**
     * Optionele zachte verwijzing naar een latere sequence-step.
     * Geen FK: die tabel bestaat in dit ticket nog niet.
     */
    sequence_step_binding: model.text().nullable(),
    /**
     * Nieuwsbriefdoelgroep. Alleen `consumers` in deze stap.
     * Geen segment-builder. Andere types laten dit leeg.
     */
    audience: model.text().nullable(),
    /**
     * Nieuwsbrief mag klaarstaan zonder activation `active`.
     * De orchestrator leest dit veld niet en er wordt niets verzonden.
     */
    ready_to_send: model.boolean().default(false),
    variants: model.hasMany(() => CommunicationTemplateVariant, {
      mappedBy: "template",
    }),
  })
  .indexes([{ on: ["communication_type"] }, { on: ["name"] }])

export default CommunicationTemplate
