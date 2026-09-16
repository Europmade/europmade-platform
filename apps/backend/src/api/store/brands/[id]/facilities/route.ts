import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { assertBrandFacilityEdit, resolveBrandAccess } from "../../brand-access"
import {
  listFacilitiesForBrand,
  loadBrandOrThrow,
  persistBrandRecord,
} from "../../brand-helpers"
import { StoreUpsertProductionFacilityBody } from "../../validators"

type RouteParams = { id: string }

type RequestWithBody = MedusaRequest & {
  validatedBody?: Record<string, unknown>
}

/**
 * GET /store/brands/:id/facilities — facilities for one brand.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  const access = await resolveBrandAccess(req.scope, seller, brand)
  if (access.level === "none") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot dit merk."
    )
  }
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const facilities = await listFacilitiesForBrand(partner, brand.id)
  res.status(200).json({ facilities, count: facilities.length })
}

/**
 * POST /store/brands/:id/facilities — productiefaciliteit toevoegen/bijwerken.
 */
export async function POST(req: RequestWithBody, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  await assertBrandFacilityEdit(req.scope, seller, brand)

  const body = StoreUpsertProductionFacilityBody.parse(
    req.validatedBody ?? req.body ?? {}
  )
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  await persistBrandRecord(partner, brand)

  const mieFields = {
    assembly_eu_band: body.assembly_eu_band ?? null,
    parts_eu_level: body.parts_eu_level ?? null,
    materials_eu_level: body.materials_eu_level ?? null,
    primary_assembly_country: body.primary_assembly_country
      ? body.primary_assembly_country.toUpperCase()
      : body.country_code.toUpperCase(),
  }

  const streetLine = [body.street?.trim(), body.house_number?.trim()]
    .filter(Boolean)
    .join(" ")
  const region =
    body.region?.trim() ||
    [streetLine, body.postal_code?.trim(), body.city?.trim()]
      .filter(Boolean)
      .join(", ") ||
    null

  const payload = {
    brand_id: brand.id,
    name:
      body.name?.trim() ||
      `Productielocatie ${body.country_code.toUpperCase()}`,
    country_code: body.country_code.toUpperCase(),
    street: body.street?.trim() || null,
    house_number: body.house_number?.trim() || null,
    postal_code: body.postal_code?.trim() || null,
    city: body.city?.trim() || null,
    region,
    description: body.description ?? null,
    manufacturer_id: body.manufacturer_id ?? null,
    is_active: body.is_active ?? true,
    ...mieFields,
  }

  let facility
  if (body.id) {
    const existing = await partner.retrieveProductionFacility(body.id)
    if (existing.brand_id !== brand.id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Deze productielocatie hoort bij een ander merk."
      )
    }
    facility = await partner.updateProductionFacilities({
      id: body.id,
      ...payload,
      brand_id: existing.brand_id,
    })
  } else {
    facility = await partner.createProductionFacilities(payload)
  }

  res.status(200).json({ facility })
}
