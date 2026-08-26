import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { assertPermission } from "../../../../modules/partner/permissions"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"

const UpsertManufacturerBody = z.object({
  name: z.string().trim().min(1).max(200),
  street: z.string().trim().max(200).optional().nullable(),
  house_number: z.string().trim().max(40).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  country_code: z.string().trim().length(2),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional().nullable(),
})

/**
 * GET /store/partner/manufacturers
 * Partner-scoped reusable manufacturers for seller product workflows.
 */
export async function GET(
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
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const manufacturers = await partner.listManufacturers(
    { represented_by_company_id: seller.company_id },
    { take: 200 }
  )
  res.status(200).json({ manufacturers, count: manufacturers.length })
}

/**
 * POST /store/partner/manufacturers
 * Create reusable manufacturer data inside current partner account.
 */
export async function POST(
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
  const body = UpsertManufacturerBody.parse(req.body ?? {})
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const created = await partner.createManufacturers({
    name: body.name,
    street: body.street?.trim() || null,
    house_number: body.house_number?.trim() || null,
    postal_code: body.postal_code?.trim() || null,
    city: body.city?.trim() || null,
    country_code: body.country_code.toUpperCase(),
    contact_email: body.contact_email.trim().toLowerCase(),
    represented_by_company_id: seller.company_id,
    ...(body.contact_phone
      ? { contact_phone: body.contact_phone.trim() }
      : {}),
  })
  res.status(200).json({ manufacturer: created })
}
