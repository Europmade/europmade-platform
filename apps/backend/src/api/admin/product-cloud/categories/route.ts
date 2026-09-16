import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { parentIdOf } from "../../../../modules/product-cloud/category-admin"
import {
  CATEGORY_ATTRIBUTE_CATALOGS,
  slugifyCategoryName,
} from "../../../../modules/product-cloud/category-attributes"

/**
 * GET /admin/product-cloud/categories — list Product Cloud categories.
 * POST — ensure category by name/slug + attribute catalog (ADR-0037).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const categories = await productCloud.listCategories(
    {},
    { order: { name: "ASC" }, relations: ["parent_category"] }
  )
  res.status(200).json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug ?? null,
      parent_category_id: parentIdOf(c),
    })),
  })
}

type EnsureBody = {
  name: string
  slug?: string
  parent_category_id?: string | null
  seed_attributes?: boolean
}

export async function POST(
  req: AuthenticatedMedusaRequest<EnsureBody>,
  res: MedusaResponse
) {
  const body = (req.validatedBody ?? req.body) as EnsureBody
  if (!body?.name?.trim()) {
    res.status(400).json({ message: "name is required" })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const requestedSlug = body.slug?.trim()
  const slug = requestedSlug || slugifyCategoryName(body.name)
  let category = (await productCloud.listCategories({ slug }))[0]
  // Name-fallback only when no explicit slug: otherwise "Baby & Kind" would
  // reuse slug `baby-en-kind` instead of creating canonical `baby-kind`.
  if (!category && !requestedSlug) {
    category = (
      await productCloud.listCategories({ name: body.name.trim() })
    )[0]
  }

  let created = false
  if (!category) {
    category = await productCloud.createCategories({
      name: body.name.trim(),
      slug,
      parent_category_id: body.parent_category_id ?? null,
    })
    created = true
  } else if (!category.slug) {
    const updated = await productCloud.updateCategories({
      id: category.id,
      slug,
    })
    category = Array.isArray(updated) ? updated[0] : updated
  }

  let attributes: { created: number; existing: number } | null = null
  if (body.seed_attributes !== false) {
    attributes = await productCloud.ensureCategoryAttributeCatalog(
      category.id,
      slug
    )
  }

  const definitions = await productCloud.listAttributeDefinitions(
    { category_id: category.id },
    { order: { sort_order: "ASC" } }
  )

  res.status(created ? 201 : 200).json({
    category,
    attributes_seed: attributes,
    attribute_definitions: definitions,
    catalog_keys: Object.keys(CATEGORY_ATTRIBUTE_CATALOGS),
  })
}
