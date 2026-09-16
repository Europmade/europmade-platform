import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"

/**
 * POST /admin/product-cloud/categories/:id/attribute-suggestions
 * Architecture for AI field suggestions. No fake AI: provider is none until wired.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const categoryId = req.params.id
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const category = await productCloud.retrieveCategory(categoryId)
  res.json({
    provider: "none",
    available: false,
    message:
      "Er is nog geen AI-provider aangesloten. Voorstellen worden niet verzonnen. Admin blijft verantwoordelijk voor juridische/compliance-verplichtingen.",
    category: { id: category.id, name: category.name, slug: category.slug },
    suggestions: [] as Array<{
      name: string
      code: string
      requirement_tier: "category_required" | "recommended" | "optional"
      unit: string | null
    }>,
  })
}
