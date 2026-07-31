import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import AuditLog from "./models/audit-log"

export type AppendAuditLogInput = {
  actor_customer_id?: string | null
  entity_type: string
  entity_id: string
  action_type: string
  reason?: string | null
}

/**
 * Audit-module — Blueprint F.2 + ADR-0026.
 * Enige schrijfpad: `append`. Update/delete zijn geblokkeerd.
 */
class AuditModuleService extends MedusaService({
  AuditLog,
}) {
  async append(input: AppendAuditLogInput) {
    const entity_type = input.entity_type.trim()
    const entity_id = input.entity_id.trim()
    const action_type = input.action_type.trim()
    if (!entity_type || !entity_id || !action_type) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "audit_log vereist entity_type, entity_id en action_type."
      )
    }
    return this.createAuditLogs({
      actor_customer_id: input.actor_customer_id?.trim() || null,
      entity_type,
      entity_id,
      action_type,
      reason: input.reason?.trim() || null,
    })
  }

  async updateAuditLogs(): Promise<never> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "audit_log is append-only — updates zijn niet toegestaan."
    )
  }

  async deleteAuditLogs(): Promise<never> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "audit_log is append-only — deletes zijn niet toegestaan."
    )
  }

  async softDeleteAuditLogs(): Promise<never> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "audit_log is append-only — soft-delete is niet toegestaan."
    )
  }
}

export default AuditModuleService
