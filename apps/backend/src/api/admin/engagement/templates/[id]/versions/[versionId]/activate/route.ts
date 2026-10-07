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

/** POST — active alleen als de version approved en ongebruikt is. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const templateId = req.params.id?.trim() ?? ""
  const versionId = req.params.versionId?.trim() ?? ""
  if (!templateId || !versionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Version vereist een template en een id."
    )
  }
  const service = cmsService(req.scope)
  await requireVersionOnTemplate(service, templateId, versionId)
  await service.transitionVersion({
    id: versionId,
    activation_status: "active",
  })
  res.status(200).json({ template: await writeTemplate(req.scope, templateId) })
}
