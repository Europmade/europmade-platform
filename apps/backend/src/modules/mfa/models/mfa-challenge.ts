import { model } from "@medusajs/framework/utils"

/**
 * Login-2FA challenge — koppelt e-mail/wachtwoord-token aan TOTP/herstelcode-stap.
 */
const MfaChallenge = model
  .define("mfa_challenge", {
    id: model.id({ prefix: "mfachal" }).primaryKey(),
    customer_id: model.text(),
    auth_token: model.text(),
    expires_at: model.dateTime(),
    consumed_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["customer_id"] }])

export default MfaChallenge
