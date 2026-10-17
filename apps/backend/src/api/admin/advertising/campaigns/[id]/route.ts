import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { serializeAdminCampaign } from "../../enrich-campaign"

type Req = MedusaRequest & { params: { id: string } }

type Pg = {
  raw: (
    sql: string,
    bindings?: unknown[]
  ) => Promise<{ rows?: Array<Record<string, unknown>> }>
}

/**
 * Targeted UPDATE — avoids MikroORM persisting missing bigNumber raw_* /
 * headline columns on drifted local schemas (no new business rules).
 */
async function patchCampaignRow(
  pg: Pg,
  id: string,
  fields: {
    status?: string
    admin_note?: string
    total_price?: number
  }
) {
  const sets: string[] = []
  const bindings: unknown[] = []

  if (typeof fields.status === "string") {
    sets.push("status = ?")
    bindings.push(fields.status)
  }
  if (typeof fields.admin_note === "string") {
    sets.push("admin_note = ?")
    bindings.push(fields.admin_note)
  }
  if (fields.total_price != null && Number.isFinite(fields.total_price)) {
    sets.push("total_price = ?")
    bindings.push(fields.total_price)
  }

  if (sets.length === 0) return

  sets.push("updated_at = NOW()")
  bindings.push(id)

  await pg.raw(
    `UPDATE "ad_campaign" SET ${sets.join(", ")} WHERE "id" = ? AND "deleted_at" IS NULL`,
    bindings
  )
}

async function softDeleteCampaignWeeks(pg: Pg, campaignId: string) {
  await pg.raw(
    `UPDATE "ad_campaign_week"
     SET "deleted_at" = NOW(), "updated_at" = NOW()
     WHERE "campaign_id" = ? AND "deleted_at" IS NULL`,
    [campaignId]
  )
}

export async function GET(req: Req, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const row = await cms.retrieveAdCampaign(req.params.id).catch(() => null)
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Campaign not found.")
  }
  const weeks = await cms.listAdCampaignWeeks(
    { campaign_id: row.id },
    { order: { week_start: "ASC" } }
  )
  res.json({
    campaign: await serializeAdminCampaign(
      req.scope,
      row as Record<string, unknown>,
      weeks as Array<Record<string, unknown>>,
      requestBackendOrigin(req)
    ),
  })
}

/**
 * PATCH /admin/advertising/campaigns/:id
 * Admin can approve, reject, cancel, or update price/note.
 * Reject requires a non-empty admin_note (P2.25-A).
 */
export async function PATCH(req: Req, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const pg = req.scope.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  ) as Pg

  const existing = await cms.retrieveAdCampaign(req.params.id).catch(() => null)
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Campaign not found.")
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const fields: {
    status?: string
    admin_note?: string
    total_price?: number
  } = {}

  if (typeof body.admin_note === "string") {
    fields.admin_note = body.admin_note
  }

  if (typeof body.status === "string") {
    const allowed = [
      "draft",
      "pending_review",
      "approved",
      "scheduled",
      "active",
      "completed",
      "rejected",
      "cancelled",
    ]
    if (!allowed.includes(body.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid status: ${body.status}`
      )
    }

    if (body.status === "rejected") {
      const noteFromBody =
        typeof body.admin_note === "string" ? body.admin_note.trim() : ""
      const noteExisting =
        typeof existing.admin_note === "string"
          ? String(existing.admin_note).trim()
          : ""
      const note = noteFromBody || noteExisting
      if (!note) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "admin_note is required when rejecting a campaign."
        )
      }
      if (noteFromBody) {
        fields.admin_note = noteFromBody
      }
    }

    fields.status = body.status
  }

  if (body.total_price != null) {
    fields.total_price = Number(body.total_price)
  }

  if (
    fields.status === "rejected" ||
    fields.status === "cancelled"
  ) {
    await softDeleteCampaignWeeks(pg, req.params.id)
  }

  await patchCampaignRow(pg, req.params.id, fields)

  const updated = await cms.retrieveAdCampaign(req.params.id)
  const weeks = await cms.listAdCampaignWeeks(
    { campaign_id: req.params.id },
    { order: { week_start: "ASC" } }
  )
  res.json({
    campaign: await serializeAdminCampaign(
      req.scope,
      updated as Record<string, unknown>,
      weeks as Array<Record<string, unknown>>,
      requestBackendOrigin(req)
    ),
  })
}
