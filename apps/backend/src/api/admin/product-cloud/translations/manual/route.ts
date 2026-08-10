import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import {
  isTranslatableField,
  normalizeLanguageCode,
} from "../../../../../modules/product-cloud/languages"

type ManualBody = {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  field_name: string
  language_code: string
  value: string
  source_language_code?: string | null
  source_value?: string | null
  source_version?: number
  updated_by?: string | null
  publish?: boolean
}

/** Admin: save manual override (protected from auto overwrite). */
export async function POST(
  req: AuthenticatedMedusaRequest<ManualBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as ManualBody
  if (
    !body?.entity_type ||
    !body?.entity_id ||
    !body?.field_name ||
    !body?.language_code ||
    typeof body.value !== "string"
  ) {
    res.status(400).json({ message: "Invalid manual translation payload" })
    return
  }

  if (!isTranslatableField(body.field_name)) {
    res.status(400).json({ message: "field_not_translatable" })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const translation = await productCloud.saveManualTranslation({
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    field_name: body.field_name,
    language_code: normalizeLanguageCode(body.language_code),
    value: body.value,
    source_language_code: body.source_language_code
      ? normalizeLanguageCode(body.source_language_code)
      : null,
    source_value: body.source_value,
    source_version: body.source_version,
    updated_by: body.updated_by ?? null,
    publish: body.publish === true,
  })

  res.status(200).json({ translation })
}
