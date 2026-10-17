import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { serializeAdminCampaign } from "../enrich-campaign"

/**
 * GET /admin/advertising/campaigns — list all campaigns (seller_name enriched).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined
  const filters: Record<string, string> = {}
  if (status) filters.status = status

  const rows = await cms.listAdCampaigns(filters, {
    order: { created_at: "DESC" },
    take: 500,
  })

  const enriched = []
  for (const row of rows) {
    const weeks = await cms.listAdCampaignWeeks(
      { campaign_id: row.id },
      { order: { week_start: "ASC" } }
    )
    enriched.push(
      await serializeAdminCampaign(
        req.scope,
        row as Record<string, unknown>,
        weeks as Array<Record<string, unknown>>,
        requestBackendOrigin(req),
        { includeProducts: false }
      )
    )
  }

  res.json({ campaigns: enriched })
}
