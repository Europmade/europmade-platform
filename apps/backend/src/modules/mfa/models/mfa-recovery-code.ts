import { model } from "@medusajs/framework/utils"

/** Eenmalige herstelcode (hash); plaintext alleen bij activatie getoond. */
const MfaRecoveryCode = model
  .define("mfa_recovery_code", {
    id: model.id({ prefix: "mfarec" }).primaryKey(),
    customer_id: model.text(),
    code_hash: model.text(),
    used_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["customer_id"] }, { on: ["code_hash"] }])

export default MfaRecoveryCode
