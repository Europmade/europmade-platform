import { model } from "@medusajs/framework/utils"

/**
 * audit_log — Blueprint `02-database-model.md` Deel F.2 (ADR-0026).
 * Append-only; soft refs naar customer (geen FK op standaardtabel).
 */
const AuditLog = model
  .define("audit_log", {
    id: model.id({ prefix: "audlog" }).primaryKey(),
    actor_customer_id: model.text().nullable(),
    entity_type: model.text(),
    entity_id: model.text(),
    action_type: model.text(),
    reason: model.text().nullable(),
  })
  .indexes([
    { on: ["entity_type", "entity_id"] },
    { on: ["created_at"] },
    { on: ["action_type"] },
  ])

export default AuditLog
