import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { slugifyCategoryName } from "../../../../../modules/product-cloud/category-attributes"
import { CATEGORY_PROPOSAL_ENTITY_ID } from "../../../../../modules/product-cloud/category-admin"

type DecideBody = {
  decision: "accept" | "reject"
  parent_category_id?: string | null
}

/**
 * POST /admin/product-cloud/category-proposals/:id
 */
export async function POST(
  req: AuthenticatedMedusaRequest<DecideBody>,
  res: MedusaResponse
) {
  const { id } = req.params as { id: string }
  const body = (req.validatedBody ?? req.body) as DecideBody
  if (body?.decision !== "accept" && body?.decision !== "reject") {
    res.status(400).json({ message: "decision must be accept or reject" })
    return
  }
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const row = await productCloud
    .retrieveProductTranslation(id)
    .catch(() => null)
  if (
    !row ||
    row.entity_id !== CATEGORY_PROPOSAL_ENTITY_ID ||
    row.field_name !== "name"
  ) {
    res.status(404).json({ message: "Proposal not found" })
    return
  }

  if (body.decision === "reject") {
    await productCloud.deleteProductTranslations(id)
    res.status(200).json({ decision: "reject" })
    return
  }

  const slug = slugifyCategoryName(row.language_code || row.value)
  const existing = (await productCloud.listCategories({ slug }))[0]
  const category =
    existing ??
    (await productCloud.createCategories({
      name: row.value.trim(),
      slug,
      parent_category_id: body.parent_category_id ?? null,
    }))
  await productCloud.deleteProductTranslations(id)
  res.status(200).json({ decision: "accept", category })
}
