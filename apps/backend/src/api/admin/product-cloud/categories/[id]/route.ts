import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { slugifyCategoryName } from "../../../../../modules/product-cloud/category-attributes"
import {
  CATEGORY_FORMER_SLUG_FIELD,
  parentIdOf,
  wouldCreateParentCycle,
} from "../../../../../modules/product-cloud/category-admin"

type RouteParams = { id: string }

type PatchBody = {
  name?: string
  slug?: string | null
  parent_category_id?: string | null
}

function serializeCategory(category: {
  id: string
  name: string
  slug?: string | null
  parent_category_id?: string | null
  parent_category?: { id?: string } | null
}) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug ?? null,
    parent_category_id: parentIdOf(category),
  }
}

/**
 * GET /admin/product-cloud/categories/:id
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  try {
    const category = await productCloud.retrieveCategory(id, {
      relations: ["parent_category"],
    })
    const translations = await productCloud.listProductTranslations({
      entity_type: "category",
      entity_id: id,
    })
    const redirects = translations.filter(
      (row) => row.field_name === CATEGORY_FORMER_SLUG_FIELD
    )
    res.status(200).json({
      category: serializeCategory(category),
      translations: translations.filter(
        (row) => row.field_name !== CATEGORY_FORMER_SLUG_FIELD
      ),
      redirects: redirects.map((row) => ({
        from_slug: row.language_code,
        to_slug: row.value,
        id: row.id,
      })),
    })
  } catch {
    res.status(404).json({ message: "Category not found" })
  }
}

/**
 * PATCH /admin/product-cloud/categories/:id — name, slug, parent.
 * Bij slug-wijziging: former_slug in pc_translation (geen nieuw modelveld).
 */
export async function PATCH(
  req: AuthenticatedMedusaRequest<PatchBody>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const body = (req.validatedBody ?? req.body) as PatchBody
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  let current
  try {
    current = await productCloud.retrieveCategory(id, {
      relations: ["parent_category"],
    })
  } catch {
    res.status(404).json({ message: "Category not found" })
    return
  }

  const nextName =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : current.name
  const nextSlug =
    body.slug === undefined
      ? current.slug
      : body.slug === null || body.slug === ""
        ? null
        : slugifyCategoryName(body.slug)
  const nextParent =
    body.parent_category_id === undefined
      ? parentIdOf(current)
      : body.parent_category_id

  if (nextParent) {
    try {
      await productCloud.retrieveCategory(nextParent)
    } catch {
      res.status(400).json({ message: "parent_category_id bestaat niet" })
      return
    }
    const all = (await productCloud.listCategories({})) as Array<{
      id: string
      parent_category_id?: string | null
      parent_category?: { id?: string } | null
    }>
    const rows = all.map((c) => ({
      id: c.id,
      parent_category_id: parentIdOf(c),
    }))
    if (wouldCreateParentCycle(rows, id, nextParent)) {
      res.status(400).json({ message: "parent_category_id veroorzaakt een cyclus" })
      return
    }
  }

  if (nextSlug) {
    const clash = (await productCloud.listCategories({ slug: nextSlug }))[0]
    if (clash && clash.id !== id) {
      res.status(409).json({ message: "slug is al in gebruik" })
      return
    }
  }

  const oldSlug = current.slug ?? null
  const updated = await productCloud.updateCategories({
    id,
    name: nextName,
    slug: nextSlug,
    parent_category_id: nextParent,
  })
  const category = Array.isArray(updated) ? updated[0] : updated

  if (oldSlug && nextSlug && oldSlug !== nextSlug) {
    const former = await productCloud.listProductTranslations({
      entity_type: "category",
      entity_id: id,
      field_name: CATEGORY_FORMER_SLUG_FIELD,
    })
    for (const row of former) {
      await productCloud.updateProductTranslations({
        id: row.id,
        value: nextSlug,
      })
    }
    await productCloud.upsertTranslation({
      entity_type: "category",
      entity_id: id,
      field_name: CATEGORY_FORMER_SLUG_FIELD,
      language_code: oldSlug,
      value: nextSlug,
      translation_status: "Gepubliceerd",
      origin: "manual",
      force_overwrite_manual: true,
    })
  }

  res.status(200).json({ category: serializeCategory(category) })
}
