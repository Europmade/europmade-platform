import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  cmsService,
  recordBody,
  requireVersionOnTemplate,
  writeTemplate,
} from "../../../../cms-request"

/**
 * POST — inhoud van een ongebruikt concept bijwerken.
 * Goedgekeurde, actieve en gebruikte versies blijven onwijzigbaar.
 * Geen verzending.
 */
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
  const body = recordBody(req.body)
  const patch: {
    id: string
    subject?: string
    preheader?: string
    body?: string
    cta_label?: string
    cta_url?: string | null
    personalization_tokens?: unknown
    version_number?: number
    variant_id?: string
  } = { id: versionId }
  if ("subject" in body) patch.subject = typeof body.subject === "string" ? body.subject : ""
  if ("preheader" in body) {
    patch.preheader = typeof body.preheader === "string" ? body.preheader : ""
  }
  if ("body" in body) patch.body = typeof body.body === "string" ? body.body : ""
  if ("cta_label" in body) {
    patch.cta_label = typeof body.cta_label === "string" ? body.cta_label : ""
  }
  if ("cta_url" in body) {
    patch.cta_url = typeof body.cta_url === "string" ? body.cta_url : null
  }
  if ("personalization_tokens" in body) {
    patch.personalization_tokens = body.personalization_tokens
  }
  if ("version_number" in body) patch.version_number = Number(body.version_number)
  if ("variant_id" in body) {
    patch.variant_id = typeof body.variant_id === "string" ? body.variant_id : ""
  }
  await service.updateVersion(patch)
  res.status(200).json({ template: await writeTemplate(req.scope, templateId) })
}
