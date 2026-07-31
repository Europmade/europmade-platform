import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AUDIT_MODULE } from "../../../modules/audit"
import type AuditModuleService from "../../../modules/audit/service"

/**
 * GET /admin/audit-log — append-only raadpleging (S3-10-01).
 * Query: entity_type, entity_id, action_type, limit
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const audit = req.scope.resolve(AUDIT_MODULE) as AuditModuleService

  const entity_type =
    typeof req.query?.entity_type === "string"
      ? req.query.entity_type.trim()
      : ""
  const entity_id =
    typeof req.query?.entity_id === "string" ? req.query.entity_id.trim() : ""
  const action_type =
    typeof req.query?.action_type === "string"
      ? req.query.action_type.trim()
      : ""

  const limitRaw =
    typeof req.query?.limit === "string" ? Number(req.query.limit) : 50
  const take = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200)
    : 50

  const filters: Record<string, string> = {}
  if (entity_type) filters.entity_type = entity_type
  if (entity_id) filters.entity_id = entity_id
  if (action_type) filters.action_type = action_type

  const rows = await audit.listAuditLogs(filters, {
    order: { created_at: "DESC" },
    take,
  })

  res.status(200).json({
    audit_log: rows.map((r) => ({
      id: r.id,
      actor_customer_id: r.actor_customer_id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      action_type: r.action_type,
      reason: r.reason,
      created_at: r.created_at,
    })),
  })
}
