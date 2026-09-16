import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { slugifyCategoryName } from "../../../../../../modules/product-cloud/category-attributes"
import { CATEGORY_FORMER_SLUG_FIELD } from "../../../../../../modules/product-cloud/category-admin"

type RouteParams = { id: string }

type RedirectBody = {
  from_slug: string
  to_slug?: string
}

/**
 * GET /admin/product-cloud/categories/:id/redirects
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
    await productCloud.retrieveCategory(id)
  } catch {
    res.status(404).json({ message: "Category not found" })
    return
  }
  const rows = await productCloud.listProductTranslations({
    entity_type: "category",
    entity_id: id,
    field_name: CATEGORY_FORMER_SLUG_FIELD,
  })
  res.status(200).json({
    redirects: rows.map((row) => ({
      id: row.id,
      from_slug: row.language_code,
      to_slug: row.value,
    })),
  })
}

/**
 * POST — registreer 301-mapping oude slug → canonieke slug (ADR-0042).
 * Opslag via bestaande pc_translation (geen nieuw modelveld).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<RedirectBody>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const body = (req.validatedBody ?? req.body) as RedirectBody
  const from = slugifyCategoryName(body?.from_slug ?? "")
  if (!from) {
    res.status(400).json({ message: "from_slug is required" })
    return
  }
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let category
  try {
    category = await productCloud.retrieveCategory(id)
  } catch {
    res.status(404).json({ message: "Category not found" })
    return
  }
  const toSlug =
    (body.to_slug ? slugifyCategoryName(body.to_slug) : null) ||
    category.slug ||
    from
  const translation = await productCloud.upsertTranslation({
    entity_type: "category",
    entity_id: id,
    field_name: CATEGORY_FORMER_SLUG_FIELD,
    language_code: from,
    value: toSlug,
    translation_status: "Gepubliceerd",
    origin: "manual",
    force_overwrite_manual: true,
  })
  const saved = Array.isArray(translation) ? translation[0] : translation
  res.status(200).json({
    redirect: {
      id: saved.id,
      from_slug: from,
      to_slug: toSlug,
    },
  })
}
