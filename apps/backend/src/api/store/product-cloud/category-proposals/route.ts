import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { slugifyCategoryName } from "../../../../modules/product-cloud/category-attributes"
import { CATEGORY_PROPOSAL_ENTITY_ID } from "../../../../modules/product-cloud/category-admin"
import { resolveApprovedSeller } from "../resolve-seller"

type ProposeBody = {
  name: string
  slug?: string
}

/**
 * POST /store/product-cloud/category-proposals
 * Seller mag een categorie voorstellen, niet publiceren.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<ProposeBody>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = (req.validatedBody ?? req.body) as ProposeBody
  const name = body?.name?.trim()
  if (!name) {
    res.status(400).json({ message: "name is required" })
    return
  }
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const suggested = slugifyCategoryName(body.slug?.trim() || name)
  const existing =
    (await productCloud.listCategories({ slug: suggested }))[0] ??
    (await productCloud.listCategories({ name }))[0]
  if (existing) {
    res.status(409).json({
      message: "Categorie bestaat al. Kies de bestaande categorie.",
      category: {
        id: existing.id,
        name: existing.name,
        slug: existing.slug ?? null,
      },
    })
    return
  }
  const translation = await productCloud.upsertTranslation({
    entity_type: "category",
    entity_id: CATEGORY_PROPOSAL_ENTITY_ID,
    field_name: "name",
    language_code: suggested,
    value: name,
    source_value: seller.id,
    translation_status: "Concept",
    origin: "manual",
    force_overwrite_manual: true,
  })
  res.status(201).json({
    proposal: {
      id: translation.id,
      name,
      suggested_slug: suggested,
    },
  })
}
