import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { slugifyCategoryName } from "../../../../modules/product-cloud/category-attributes"
import { CATEGORY_FORMER_SLUG_FIELD } from "../../../../modules/product-cloud/category-admin"

function readQueryString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
    return value[0]
  }
  return null
}

/**
 * GET /store/product-cloud/category-redirects?from=old-slug
 * Publieke 301-lookup (ADR-0042). Geen stille 404 bij bekende mapping.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const fromRaw = readQueryString(req.query.from)
  if (!fromRaw) {
    res.status(400).json({ message: "from is required" })
    return
  }
  const from = slugifyCategoryName(fromRaw)
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const rows = await productCloud.listProductTranslations({
    entity_type: "category",
    field_name: CATEGORY_FORMER_SLUG_FIELD,
    language_code: from,
  })
  const hit = rows[0]
  if (!hit?.value) {
    res.status(404).json({ redirect: null })
    return
  }
  res.status(200).json({
    redirect: {
      from_slug: from,
      to_slug: hit.value,
    },
  })
}
