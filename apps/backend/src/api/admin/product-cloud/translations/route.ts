import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"

type TranslationBody = {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  field_name: string
  language_code: string
  value: string
  source_language_code?: string | null
  source_value?: string | null
  translation_status?:
    | "Ontbreekt"
    | "Concept"
    | "Machine"
    | "Beoordeeld"
    | "Gepubliceerd"
  translation_version?: number
}

/**
 * Admin translation upsert — architecture only (no AI translate service).
 * Supports NL / FR / DE (+ later EU languages) via language_code.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<TranslationBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as TranslationBody
  if (
    !body?.entity_type ||
    !body?.entity_id ||
    !body?.field_name ||
    !body?.language_code ||
    typeof body.value !== "string"
  ) {
    res.status(400).json({ message: "Invalid translation payload" })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const translation = await productCloud.upsertTranslation(body)
  res.status(200).json({ translation })
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const entity_type =
    typeof req.query.entity_type === "string" ? req.query.entity_type : null
  const entity_id =
    typeof req.query.entity_id === "string" ? req.query.entity_id : null
  const language_code =
    typeof req.query.language_code === "string"
      ? req.query.language_code
      : null

  if (!entity_type || !entity_id) {
    res.status(400).json({ message: "entity_type and entity_id required" })
    return
  }

  const filter: Record<string, string> = { entity_type, entity_id }
  if (language_code) filter.language_code = language_code

  const translations = await productCloud.listProductTranslations(filter)
  res.status(200).json({ translations })
}
