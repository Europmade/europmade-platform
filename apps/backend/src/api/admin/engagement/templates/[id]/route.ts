import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadEngagementTemplate } from "../../admin-engagement-query"
import { cmsService, optionalString, recordBody, writeTemplate } from "../../cms-request"

function templateId(req: AuthenticatedMedusaRequest): string {
  const id = req.params.id?.trim() ?? ""
  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Template vereist een id.")
  }
  return id
}

/** GET /admin/engagement/templates/:id — template, varianten en versions. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const template = await loadEngagementTemplate(req.scope, templateId(req))
  if (!template) {
    res.status(404).json({ message: "Template niet gevonden." })
    return
  }
  res.status(200).json({ template })
}

/** POST /admin/engagement/templates/:id — naam en communication_type. Geen inhoud. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = templateId(req)
  const body = recordBody(req.body)
  await cmsService(req.scope).updateTemplate({
    id,
    name: optionalString(body, "name"),
    communication_type: optionalString(body, "communication_type"),
    ...("audience" in body
      ? { audience: typeof body.audience === "string" ? body.audience : null }
      : {}),
  })
  res.status(200).json({ template: await writeTemplate(req.scope, id) })
}
