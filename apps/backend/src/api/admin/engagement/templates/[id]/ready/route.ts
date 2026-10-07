import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cmsService, recordBody, writeTemplate } from "../../../cms-request"

/**
 * POST /admin/engagement/templates/:id/ready
 * Zet een goedgekeurde nieuwsbrief op klaar voor verzending.
 * Zet activation niet op active en verzendt niets.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const templateId = req.params.id?.trim() ?? ""
  const body = recordBody(req.body)
  const versionId = typeof body.version_id === "string" ? body.version_id.trim() : ""
  if (!templateId || !versionId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Kies een goedgekeurde versie.")
  }
  const service = cmsService(req.scope)
  const version = (await service.retrieveCommunicationTemplateVersion(versionId)) as {
    id: string
    approval_status?: string
    activation_status?: string
  }
  if (version.approval_status !== "approved") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen een goedgekeurde nieuwsbrief kan klaar voor verzending worden gezet."
    )
  }
  await service.markNewsletterReady(templateId)
  res.status(200).json({ template: await writeTemplate(req.scope, templateId) })
}
