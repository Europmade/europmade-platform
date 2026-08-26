import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { assertPermission } from "../../../../../modules/partner/permissions"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"

type RouteParams = { id: string }

const PatchManufacturerBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  street: z.string().trim().max(200).optional().nullable(),
  house_number: z.string().trim().max(40).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  country_code: z.string().trim().length(2).optional(),
  contact_email: z.string().trim().email().max(200).optional(),
  contact_phone: z.string().trim().max(40).optional().nullable(),
})

/**
 * PATCH /store/partner/manufacturers/:id
 * Update own reusable manufacturer data.
 */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  assertPermission(seller, "products.manage")
  if (!seller.company_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen partnerbedrijf gekoppeld."
    )
  }
  const { id } = req.params as RouteParams
  const body = PatchManufacturerBody.parse(req.body ?? {})
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const current = await partner.retrieveManufacturer(id)
  if (
    (current as { represented_by_company_id?: string | null })
      .represented_by_company_id !== seller.company_id
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot deze fabrikant."
    )
  }

  const updated = await partner.updateManufacturers({
    id,
    ...(body.name != null ? { name: body.name } : {}),
    ...(body.street !== undefined ? { street: body.street?.trim() || null } : {}),
    ...(body.house_number !== undefined
      ? { house_number: body.house_number?.trim() || null }
      : {}),
    ...(body.postal_code !== undefined
      ? { postal_code: body.postal_code?.trim() || null }
      : {}),
    ...(body.city !== undefined ? { city: body.city?.trim() || null } : {}),
    ...(body.country_code != null
      ? { country_code: body.country_code.toUpperCase() }
      : {}),
    ...(body.contact_email != null
      ? { contact_email: body.contact_email.trim().toLowerCase() }
      : {}),
    ...(body.contact_phone !== undefined
      ? { contact_phone: body.contact_phone?.trim() || null }
      : {}),
  })

  res.status(200).json({ manufacturer: updated })
}
