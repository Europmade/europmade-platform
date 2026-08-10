import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"

/** Admin: full translation summary for a product_version. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const entity_type =
    typeof req.query.entity_type === "string" ? req.query.entity_type : null
  const entity_id =
    typeof req.query.entity_id === "string" ? req.query.entity_id : null

  if (entity_type !== "product_version" || !entity_id) {
    res.status(400).json({
      message: "entity_type=product_version and entity_id are required",
    })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  try {
    const summary = await productCloud.getProductVersionTranslationSummary({
      version_id: entity_id,
    })
    res.status(200).json(summary)
  } catch {
    res.status(404).json({ message: "Productversie niet gevonden." })
  }
}
