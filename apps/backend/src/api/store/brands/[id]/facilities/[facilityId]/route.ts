import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { resolveApprovedSeller } from "../../../../product-cloud/resolve-seller"
import { assertBrandFacilityEdit } from "../../../brand-access"
import { loadBrandOrThrow } from "../../../brand-helpers"

type RouteParams = { id: string; facilityId: string }

/**
 * DELETE /store/brands/:id/facilities/:facilityId
 * Soft-deactivates the production location. Existing product links stay intact.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id, facilityId } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  await assertBrandFacilityEdit(req.scope, seller, brand)

  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const facility = await partner.retrieveProductionFacility(facilityId)
  if (facility.brand_id !== brand.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze productielocatie hoort bij een ander merk."
    )
  }

  await partner.updateProductionFacilities({
    id: facilityId,
    is_active: false,
  })
  res.status(200).json({
    deleted: true,
    facility_id: facilityId,
    is_active: false,
  })
}
