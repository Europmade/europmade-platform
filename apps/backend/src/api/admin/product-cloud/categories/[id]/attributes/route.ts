import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { resolveRequirementTier } from "../../../../../../modules/product-cloud/category-attributes"

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

const Body = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(80).regex(/^[a-z0-9_]+$/),
  data_type: z.enum(["Numeriek", "Keuzelijst", "Tekst-met-eenheid"]),
  requirement_tier: z
    .enum([
      "compliance_required",
      "category_required",
      "recommended",
      "optional",
      "not_applicable",
    ])
    .optional()
    .default("optional"),
  unit: z.string().trim().max(40).nullable().optional(),
  help_text: z.string().trim().max(2000).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional().default(100),
  is_active: z.boolean().optional().default(true),
  option_values: z.array(z.string().trim().min(1)).nullable().optional(),
})

/**
 * POST /admin/product-cloud/categories/:id/attributes
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const categoryId = req.params.id
  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message || "Ongeldig productveld."
    )
  }
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  await productCloud.retrieveCategory(categoryId)
  const tier = resolveRequirementTier({
    is_required:
      parsed.data.requirement_tier === "category_required" ||
      parsed.data.requirement_tier === "compliance_required",
    requirement_tier: parsed.data.requirement_tier,
  })
  const created = await productCloud.createAttributeDefinitions({
    category_id: categoryId,
    name: parsed.data.name,
    code: parsed.data.code,
    data_type: parsed.data.data_type,
    is_required:
      tier === "category_required" || tier === "compliance_required",
    requirement_tier: tier,
    unit: parsed.data.unit ?? null,
    help_text: parsed.data.help_text ?? null,
    sort_order: parsed.data.sort_order,
    is_active: parsed.data.is_active,
    option_values: parsed.data.option_values
      ? JSON.stringify(parsed.data.option_values)
      : null,
  })
  res.status(201).json({ attribute_definition: created })
}
