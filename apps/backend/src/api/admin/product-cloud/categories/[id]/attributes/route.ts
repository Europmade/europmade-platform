import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"

/**
 * GET /admin/product-cloud/categories/:id/attributes
 * Structured, category-scoped attribute definitions (filters/guides prep).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const categoryId = req.params.id
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const category = await productCloud.retrieveCategory(categoryId).catch(() => null)
  if (!category) {
    res.status(404).json({ message: "Category not found" })
    return
  }

  const attribute_definitions = await productCloud.listAttributeDefinitions(
    { category_id: categoryId },
    { order: { sort_order: "ASC" } }
  )

  res.status(200).json({
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
    },
    attribute_definitions,
  })
}
