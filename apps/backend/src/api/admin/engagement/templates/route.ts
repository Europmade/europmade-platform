import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadEngagementTemplates } from "../admin-engagement-query"
import { cmsService, recordBody, requiredString, writeTemplate } from "../cms-request"

/** GET /admin/engagement/templates — Communication CMS-overzicht. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await loadEngagementTemplates(req.scope)
  res.status(200).json(result)
}

/** POST /admin/engagement/templates — alleen identiteit, geen inhoud. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = recordBody(req.body)
  const created = await cmsService(req.scope).createTemplate({
    name: requiredString(body, "name", "Naam"),
    communication_type: requiredString(body, "communication_type", "Type"),
  })
  const template = await writeTemplate(req.scope, created.id)
  res.status(201).json({ template })
}
