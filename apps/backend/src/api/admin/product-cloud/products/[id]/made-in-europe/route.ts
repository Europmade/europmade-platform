import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import {
  loadMadeInEuropeForProduct,
  serializeProductionLocation,
  upsertProductMadeInEurope,
} from "../../../../../store/product-cloud/made-in-europe-helpers"

type RouteParams = { id: string }

const AdminAssignMadeInEuropeBody = z.object({
  production_facility_id: z.string().trim().min(1).optional().nullable(),
  assembly_eu_band: z
    .enum(["eu_100", "eu_75_99", "eu_50_74", "eu_below_50"])
    .optional(),
  parts_eu_level: z.enum(["eu_majority", "eu_partial", "eu_none"]).optional(),
  materials_eu_level: z
    .enum(["eu_majority", "eu_partial", "eu_none"])
    .optional(),
  primary_assembly_country: z.string().trim().length(2).optional().nullable(),
})

/**
 * POST /admin/product-cloud/products/:id/made-in-europe
 * Admin kan assemblage/onderdelen/materialen vastleggen. Score blijft server-side.
 * Keurt niet goed en publiceert niet.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const parsed = AdminAssignMadeInEuropeBody.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige Made in Europe-gegevens. Kies assemblage, onderdelen en materialen uit de vaste lijst."
    )
  }
  if (
    !parsed.data.assembly_eu_band ||
    !parsed.data.parts_eu_level ||
    !parsed.data.materials_eu_level
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kies assemblage, onderdelen én materialen. Zonder die drie gegevens wordt geen score berekend."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let product: {
    id: string
    brand_id: string
    manufacturer_id: string
    current_owner_seller_id: string
  }
  try {
    product = await productCloud.retrieveProduct(id)
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product niet gevonden.")
  }
  if (!product.current_owner_seller_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Dit product heeft geen gekoppelde seller voor Made in Europe-gegevens."
    )
  }

  const result = await upsertProductMadeInEurope(req.scope, {
    product_id: id,
    seller_id: product.current_owner_seller_id,
    brand_id: product.brand_id,
    manufacturer_id: product.manufacturer_id,
    input: parsed.data,
  })
  const loaded = await loadMadeInEuropeForProduct(req.scope, id)

  res.status(200).json({
    product_id: result.product_id,
    product_version_id: result.product_version_id,
    made_in_europe: {
      score: loaded?.score ?? null,
      origin: loaded?.origin ?? null,
      facility: serializeProductionLocation(loaded?.facility ?? null),
    },
    note: "Gegevens opgeslagen. De score is berekend als de banden compleet zijn. Bewijs en publicatie zijn niet gewijzigd.",
  })
}
