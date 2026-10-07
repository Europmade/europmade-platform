import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  cmsService,
  optionalString,
  recordBody,
  requireVariantOnTemplate,
  writeTemplate,
} from "../../../../cms-request"

/** POST — naam en locale van een variant. De templatekoppeling blijft. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const templateId = req.params.id?.trim() ?? ""
  const variantId = req.params.variantId?.trim() ?? ""
  if (!templateId || !variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Variant vereist een template en een id."
    )
  }
  const service = cmsService(req.scope)
  await requireVariantOnTemplate(service, templateId, variantId)
  const body = recordBody(req.body)
  await service.updateVariant({
    id: variantId,
    name: optionalString(body, "name"),
    locale: optionalString(body, "locale"),
  })
  res.status(200).json({ template: await writeTemplate(req.scope, templateId) })
}
