import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"

/**
 * Public/store read of Product Cloud categories (slug + attribute codes).
 * No Commerce data. Safe for later storefront coupling.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const slug = typeof req.query.slug === "string" ? req.query.slug : null
  const categories = slug
    ? await productCloud.listCategories({ slug })
    : await productCloud.listCategories({}, { order: { name: "ASC" } })

  const enriched: Array<{
    id: string
    name: string
    slug: string | null
    parent_category_id: string | null
    attributes: Array<{
      id: string
      code: string | null
      name: string
      data_type: string
      unit: string | null
      is_required: boolean
      is_filterable: boolean
      is_comparable: boolean
      sort_order: number
      option_values: string | null
    }>
  }> = []
  for (const category of categories) {
    const attribute_definitions =
      await productCloud.listAttributeDefinitions(
        { category_id: category.id },
        { order: { sort_order: "ASC" } }
      )
    enriched.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent_category_id: category.parent_category_id ?? null,
      attributes: attribute_definitions.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        data_type: a.data_type,
        unit: a.unit,
        is_required: a.is_required,
        is_filterable: a.is_filterable,
        is_comparable: a.is_comparable,
        sort_order: a.sort_order,
        option_values: a.option_values,
      })),
    })
  }

  res.status(200).json({ categories: enriched })
}
