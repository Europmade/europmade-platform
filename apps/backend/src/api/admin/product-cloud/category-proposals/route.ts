import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { CATEGORY_PROPOSAL_ENTITY_ID } from "../../../../modules/product-cloud/category-admin"

/**
 * GET /admin/product-cloud/category-proposals
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const rows = await productCloud.listProductTranslations({
    entity_type: "category",
    entity_id: CATEGORY_PROPOSAL_ENTITY_ID,
    field_name: "name",
  })
  res.status(200).json({
    proposals: rows.map((row) => ({
      id: row.id,
      name: row.value,
      suggested_slug: row.language_code,
      seller_id: row.source_value ?? null,
      status: row.translation_status,
    })),
  })
}
