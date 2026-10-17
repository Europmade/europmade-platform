import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import {
  normalizeGtinDigits,
  planGtinAssignment,
  type GtinOwner,
} from "../../../../../../modules/product-cloud/gtin-validation"

type RouteParams = { id: string }

/**
 * POST /admin/product-cloud/products/:id/identifier
 * Corrects the central GTIN. Does not write offer, price or stock fields.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const raw = String((req.body as { identifier_value?: string } | undefined)?.identifier_value || "")
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  await productCloud.retrieveProduct(id)
  const variants = (await productCloud.listProductVariants(
    { product_id: id },
    { take: 20 }
  )) as Array<{ id: string }>
  const variantIds = variants.map((row) => row.id)
  const identifiers = variantIds.length
    ? ((await productCloud.listIdentifiers(
        { product_variant_id: variantIds },
        { take: 50 }
      )) as Array<{ id: string; identifier_type: string; identifier_value: string; product_variant_id: string }>)
    : []
  const current = identifiers.find((row) => row.identifier_type === "GTIN") || null
  const digits = normalizeGtinDigits(raw)
  const matches = digits
    ? ((await productCloud.listIdentifiers(
        { identifier_value: digits, identifier_type: "GTIN" },
        { take: 10 }
      )) as Array<{ id: string; identifier_value: string; product_variant_id: string }>)
    : []
  const owners: GtinOwner[] = []
  for (const row of matches) {
    try {
      const variant = await productCloud.retrieveProductVariant(row.product_variant_id)
      owners.push({
        identifier_id: row.id,
        product_id: variant.product_id as string,
        value: row.identifier_value,
      })
    } catch {
      /* skip a dangling identifier */
    }
  }
  const plan = planGtinAssignment({
    raw,
    productId: id,
    currentValue: current?.identifier_value || null,
    owners,
  })
  if (!plan.ok) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, plan.message)
  }
  if (!plan.unchanged) {
    if (current) {
      await productCloud.updateIdentifiers({ id: current.id, identifier_value: plan.digits })
    } else if (variants[0]) {
      await productCloud.createIdentifiers({
        product_variant_id: variants[0].id,
        identifier_type: "GTIN",
        identifier_value: plan.digits,
        country_scope: null,
      })
    } else {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Dit product heeft nog geen variant om de EAN/GTIN op te zetten."
      )
    }
  }
  res.json({ identifier_value: plan.digits, updated: !plan.unchanged })
}
