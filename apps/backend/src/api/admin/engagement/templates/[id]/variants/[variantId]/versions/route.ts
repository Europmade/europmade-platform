import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  assertDraftVersionCreate,
  cmsService,
  recordBody,
  requiredString,
  requireVariantOnTemplate,
  writeTemplate,
} from "../../../../../cms-request"

/**
 * POST — nieuwe TemplateVersion. Altijd draft + inactive.
 * version_number kiest de service. Geen verzending.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const templateId = req.params.id?.trim() ?? ""
  const variantId = req.params.variantId?.trim() ?? ""
  if (!templateId || !variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Version vereist een template en een variant."
    )
  }
  const body = recordBody(req.body)
  assertDraftVersionCreate(body)
  const service = cmsService(req.scope)
  await requireVariantOnTemplate(service, templateId, variantId)
  await service.createVersion({
    variant_id: variantId,
    subject: requiredString(body, "subject", "Onderwerp"),
    preheader: requiredString(body, "preheader", "Preheader"),
    body: requiredString(body, "body", "Body"),
    cta_label: requiredString(body, "cta_label", "CTA-label"),
    cta_url: typeof body.cta_url === "string" ? body.cta_url : null,
    personalization_tokens: body.personalization_tokens ?? [],
  })
  res.status(201).json({ template: await writeTemplate(req.scope, templateId) })
}
