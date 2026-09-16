import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"

const Body = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  data_type: z.enum(["Numeriek", "Keuzelijst", "Tekst-met-eenheid"]).optional(),
  requirement_tier: z
    .enum([
      "compliance_required",
      "category_required",
      "recommended",
      "optional",
      "not_applicable",
    ])
    .optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  help_text: z.string().trim().max(2000).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
  option_values: z.array(z.string().trim().min(1)).nullable().optional(),
})

type RouteParams = { id: string; attrId: string }

/**
 * PATCH /admin/product-cloud/categories/:id/attributes/:attrId
 */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id, attrId } = req.params as RouteParams
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
  const row = await productCloud.retrieveAttributeDefinition(attrId)
  if (row.category_id !== id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Veld hoort niet bij deze categorie."
    )
  }
  const patch: Record<string, unknown> = { id: attrId }
  if (parsed.data.name != null) patch.name = parsed.data.name
  if (parsed.data.data_type != null) patch.data_type = parsed.data.data_type
  if (parsed.data.requirement_tier != null) {
    patch.requirement_tier = parsed.data.requirement_tier
    patch.is_required =
      parsed.data.requirement_tier === "category_required" ||
      parsed.data.requirement_tier === "compliance_required"
  }
  if (parsed.data.unit !== undefined) patch.unit = parsed.data.unit
  if (parsed.data.help_text !== undefined) patch.help_text = parsed.data.help_text
  if (parsed.data.sort_order != null) patch.sort_order = parsed.data.sort_order
  if (parsed.data.is_active != null) patch.is_active = parsed.data.is_active
  if (parsed.data.option_values !== undefined) {
    patch.option_values = parsed.data.option_values
      ? JSON.stringify(parsed.data.option_values)
      : null
  }
  const updated = await productCloud.updateAttributeDefinitions(patch)
  res.json({ attribute_definition: updated })
}
