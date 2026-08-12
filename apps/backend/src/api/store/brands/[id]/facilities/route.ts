import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { assertBrandFacilityEdit } from "../../brand-access"
import { loadBrandOrThrow } from "../../brand-helpers"
import { StoreUpsertProductionFacilityBody } from "../../validators"

type RouteParams = { id: string }

/**
 * POST /store/brands/:id/facilities — productiefaciliteit toevoegen/bijwerken.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  await assertBrandFacilityEdit(req.scope, seller, brand)

  const body = StoreUpsertProductionFacilityBody.parse(req.body)
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService

  let facility
  if (body.id) {
    facility = await partner.updateProductionFacilities({
      id: body.id,
      brand_id: brand.id,
      name: body.name,
      country_code: body.country_code.toUpperCase(),
      region: body.region ?? null,
      description: body.description ?? null,
      manufacturer_id: body.manufacturer_id ?? null,
      is_active: body.is_active ?? true,
    })
  } else {
    facility = await partner.createProductionFacilities({
      brand_id: brand.id,
      name: body.name,
      country_code: body.country_code.toUpperCase(),
      region: body.region ?? null,
      description: body.description ?? null,
      manufacturer_id: body.manufacturer_id ?? null,
      is_active: body.is_active ?? true,
    })
  }

  res.status(200).json({ facility })
}
