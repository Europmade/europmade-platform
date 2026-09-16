import { model } from "@medusajs/framework/utils"

/**
 * Methode-onafhankelijk 2FA-credential (authenticatie/spec.md §1.7).
 * MVP: type = totp. status pending tot bevestigingscode slaagt.
 */
const MfaCredential = model
  .define("mfa_credential", {
    id: model.id({ prefix: "mfacred" }).primaryKey(),
    customer_id: model.text(),
    type: model.text().default("totp"),
    secret: model.text(),
    status: model.text().default("pending"),
  })
  .indexes([
    { on: ["customer_id"] },
    { on: ["customer_id", "status"] },
  ])

export default MfaCredential
