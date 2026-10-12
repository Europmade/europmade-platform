import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cmsService, requireVersionOnTemplate } from "../../../../cms-request"

/** DELETE — alleen een ongebruikt concept of een versie ter beoordeling. */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const templateId = req.params.id?.trim() ?? ""
  const versionId = req.params.versionId?.trim() ?? ""
  if (!templateId || !versionId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Version vereist een template en een id.")
  }
  const service = cmsService(req.scope)
  await requireVersionOnTemplate(service, templateId, versionId)
  await service.deleteUnusedTemplate(templateId)
  res.status(200).json({ deleted: true })
}
