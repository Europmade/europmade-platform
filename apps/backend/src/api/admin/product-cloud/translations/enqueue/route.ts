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

type EnqueueBody = {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  source_language_code: string
  source_fields: Record<string, string>
  target_language_codes?: string[]
  source_version?: number
  content_type?: string
  category?: string
  force_overwrite_manual?: boolean
  only_stale?: boolean
  only_missing?: boolean
  only_failed?: boolean
  auto_publish?: boolean
  updated_by?: string | null
}

/**
 * Admin: enqueue machine translations (ADR-0039).
 * Manual overrides are protected unless force_overwrite_manual=true.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<EnqueueBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as EnqueueBody

  if (
    !body?.entity_type ||
    !body?.entity_id ||
    !body?.source_language_code ||
    !body?.source_fields ||
    typeof body.source_fields !== "object"
  ) {
    res.status(400).json({ message: "Invalid enqueue payload" })
    return
  }

  const source = normalizeLanguageCode(body.source_language_code)
  const filteredFields: Record<string, string> = {}
  for (const [key, value] of Object.entries(body.source_fields)) {
    if (!isTranslatableField(key)) continue
    if (typeof value !== "string" || !value.trim()) continue
    filteredFields[key] = value
  }

  if (Object.keys(filteredFields).length === 0) {
    res.status(400).json({
      message:
        "No translatable source_fields (codes/EAN/SKU are not translated)",
    })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const result = await productCloud.enqueueMachineTranslations({
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    source_language_code: source,
    source_fields: filteredFields,
    target_language_codes: body.target_language_codes?.map(
      normalizeLanguageCode
    ),
    source_version: body.source_version,
    content_type: body.content_type,
    category: body.category,
    force_overwrite_manual: body.force_overwrite_manual === true,
    only_stale: body.only_stale === true,
    only_missing: body.only_missing === true,
    only_failed: body.only_failed === true,
    auto_publish: body.auto_publish === true,
    updated_by: body.updated_by ?? null,
  })

  const { PRODUCT_CLOUD_ACTIVE_LANGUAGES } = await import(
    "../../../../../modules/product-cloud/languages"
  )

  res.status(200).json({
    ...result,
    active_languages: [...PRODUCT_CLOUD_ACTIVE_LANGUAGES],
    credentials_required: !result.provider_configured
      ? [
          "PRODUCT_CLOUD_TRANSLATION_PROVIDER",
          "PRODUCT_CLOUD_TRANSLATION_API_KEY",
        ]
      : [],
  })
}
