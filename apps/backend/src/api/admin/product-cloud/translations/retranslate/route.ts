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

type RetranslateBody = {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  source_language_code: string
  source_fields: Record<string, string>
  /** One language, or omit for all active targets / only_stale. */
  target_language_code?: string
  target_language_codes?: string[]
  source_version?: number
  content_type?: string
  only_stale?: boolean
  only_missing?: boolean
  only_failed?: boolean
  /** Required confirmation to replace manual overrides. */
  force_overwrite_manual?: boolean
  auto_publish?: boolean
  updated_by?: string | null
}

/**
 * Admin: retranslate one language or all outdated (ADR-0039).
 * Distinct from regenerating source content.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<RetranslateBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as RetranslateBody
  if (
    !body?.entity_type ||
    !body?.entity_id ||
    !body?.source_language_code ||
    !body?.source_fields
  ) {
    res.status(400).json({ message: "Invalid retranslate payload" })
    return
  }

  const filteredFields: Record<string, string> = {}
  for (const [key, value] of Object.entries(body.source_fields)) {
    if (!isTranslatableField(key)) continue
    if (typeof value !== "string" || !value.trim()) continue
    filteredFields[key] = value
  }

  const targets = body.target_language_code
    ? [normalizeLanguageCode(body.target_language_code)]
    : body.target_language_codes?.map(normalizeLanguageCode)

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const result = await productCloud.enqueueMachineTranslations({
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    source_language_code: normalizeLanguageCode(body.source_language_code),
    source_fields: filteredFields,
    target_language_codes: targets,
    source_version: body.source_version,
    content_type: body.content_type,
    force_overwrite_manual: body.force_overwrite_manual === true,
    only_stale: body.only_stale === true,
    only_missing: body.only_missing === true,
    only_failed: body.only_failed === true,
    auto_publish: body.auto_publish === true,
    updated_by: body.updated_by ?? null,
  })

  res.status(200).json(result)
}
