import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { normalizeLanguageCode } from "../../../../../modules/product-cloud/languages"

type PublishBody = {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  field_name: string
  language_code: string
  updated_by?: string | null
}

/** Admin: publish translation for storefront (Gepubliceerd). */
export async function POST(
  req: AuthenticatedMedusaRequest<PublishBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as PublishBody
  if (
    !body?.entity_type ||
    !body?.entity_id ||
    !body?.field_name ||
    !body?.language_code
  ) {
    res.status(400).json({ message: "Invalid publish payload" })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  try {
    const translation = await productCloud.publishTranslation({
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      field_name: body.field_name,
      language_code: normalizeLanguageCode(body.language_code),
      updated_by: body.updated_by ?? null,
    })
    res.status(200).json({ translation })
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : "publish_failed",
    })
  }
}
