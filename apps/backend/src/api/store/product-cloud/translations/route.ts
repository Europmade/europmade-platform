import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { normalizeLanguageCode } from "../../../../modules/product-cloud/languages"

type EntityType = "product_version" | "category" | "attribute_definition"

function readQueryString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
    return value[0]
  }
  return null
}

function parseSourceFields(raw: unknown): Record<string, string> | null {
  if (raw == null) return {}
  if (typeof raw === "string") {
    try {
      return parseSourceFields(JSON.parse(raw))
    } catch {
      return null
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    )
  }
  return null
}

async function resolveTranslations(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  input: {
    entity_type: EntityType
    entity_id: string
    locale: string
    source_language_code: string | null
    source_fields: Record<string, string>
  }
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const locale = normalizeLanguageCode(input.locale)

  if (Object.keys(input.source_fields).length === 0) {
    const translations = await productCloud.listProductTranslations({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
    })
    res.status(200).json({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      locale,
      fields: [],
      translations,
      fallback_policy: "source_when_missing",
    })
    return
  }

  const fields = await productCloud.resolveLocalizedEntityFields({
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    locale,
    source_language_code: input.source_language_code,
    source_fields: input.source_fields,
  })

  res.status(200).json({
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    locale,
    fields,
    fallback_policy: "source_when_missing",
  })
}

/**
 * Public resolve of pc_translation fields for a locale with source fallback.
 * GET query or POST JSON body (ADR-0038). No invented translations.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const entity_type = readQueryString(req.query.entity_type) as EntityType | null
  const entity_id = readQueryString(req.query.entity_id)
  const localeRaw = readQueryString(req.query.locale)
  const source_language_code = readQueryString(req.query.source_language_code)

  if (!entity_type || !entity_id || !localeRaw) {
    res.status(400).json({
      message: "entity_type, entity_id and locale are required",
    })
    return
  }

  const source_fields = parseSourceFields(req.query.source_fields)
  if (source_fields == null) {
    res.status(400).json({ message: "source_fields must be JSON object" })
    return
  }

  await resolveTranslations(req, res, {
    entity_type,
    entity_id,
    locale: localeRaw,
    source_language_code: source_language_code
      ? normalizeLanguageCode(source_language_code)
      : null,
    source_fields,
  })
}

type ResolveBody = {
  entity_type: EntityType
  entity_id: string
  locale: string
  source_language_code?: string | null
  source_fields?: Record<string, string>
}

export async function POST(
  req: AuthenticatedMedusaRequest<ResolveBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as ResolveBody
  if (!body?.entity_type || !body?.entity_id || !body?.locale) {
    res.status(400).json({
      message: "entity_type, entity_id and locale are required",
    })
    return
  }

  const source_fields = parseSourceFields(body.source_fields ?? {})
  if (source_fields == null) {
    res.status(400).json({ message: "source_fields must be an object" })
    return
  }

  await resolveTranslations(req, res, {
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    locale: body.locale,
    source_language_code: body.source_language_code
      ? normalizeLanguageCode(body.source_language_code)
      : null,
    source_fields,
  })
}
