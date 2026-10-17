import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { inspectBrandImport } from "../run"
import { brandImportRequest } from "../shared"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const inspected = await inspectBrandImport(req.scope, brandImportRequest(req))
  res.json({
    preview: inspected.preview,
    plan_blocked: inspected.plan.blocked,
    plan_reason: inspected.plan.reason,
    action_count: inspected.plan.actions.length,
    creates_offers: false,
  })
}
