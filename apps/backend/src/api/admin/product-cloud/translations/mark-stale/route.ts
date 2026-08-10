import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"

type MarkStaleBody = {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  new_source_version: number
  field_names?: string[]
}

/**
 * Admin: after source regenerate/edit — mark translations Verouderd.
 * Does not overwrite values or call the provider.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<MarkStaleBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as MarkStaleBody
  if (
    !body?.entity_type ||
    !body?.entity_id ||
    typeof body.new_source_version !== "number"
  ) {
    res.status(400).json({ message: "Invalid mark-stale payload" })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const result = await productCloud.markTranslationsStale({
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    new_source_version: body.new_source_version,
    field_names: body.field_names,
  })

  res.status(200).json(result)
}
