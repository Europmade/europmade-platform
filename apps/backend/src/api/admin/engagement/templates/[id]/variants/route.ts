import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  cmsService,
  recordBody,
  requiredString,
  writeTemplate,
} from "../../../cms-request"

/** POST /admin/engagement/templates/:id/variants — naam en locale, geen inhoud. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const templateId = req.params.id?.trim() ?? ""
  if (!templateId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Template vereist een id.")
  }
  const body = recordBody(req.body)
  await cmsService(req.scope).createVariant({
    template_id: templateId,
    name: requiredString(body, "name", "Naam"),
    locale: requiredString(body, "locale", "Locale"),
  })
  res.status(201).json({ template: await writeTemplate(req.scope, templateId) })
}
