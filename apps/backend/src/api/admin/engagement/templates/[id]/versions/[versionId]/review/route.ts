import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  cmsService,
  requireVersionOnTemplate,
  writeTemplate,
} from "../../../../../cms-request"

/** POST — ongebruikt concept naar ter beoordeling. Geen verzending. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const templateId = req.params.id?.trim() ?? ""
  const versionId = req.params.versionId?.trim() ?? ""
  if (!templateId || !versionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Een versie vereist een bericht."
    )
  }
  const service = cmsService(req.scope)
  const version = (await requireVersionOnTemplate(
    service,
    templateId,
    versionId
  )) as { id: string; variant_id: string }
  const current = (await service.retrieveCommunicationTemplateVersion(
    version.id
  )) as {
    approval_status: string
    activation_status: string
    used_at: Date | string | null
  }
  if (current.used_at || current.approval_status !== "draft") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen een concept kan ter beoordeling worden gezet."
    )
  }
  await service.transitionVersion({
    id: versionId,
    approval_status: "pending_review",
  })
  res.status(200).json({ template: await writeTemplate(req.scope, templateId) })
}
