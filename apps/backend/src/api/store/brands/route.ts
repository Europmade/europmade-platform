import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveApprovedSeller } from "../product-cloud/resolve-seller"
import {
  createOwnedBrandForSeller,
  listManageableBrands,
} from "./brand-helpers"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { hasPermission } from "../../../modules/partner/permissions"
import { StoreCreateBrandBody } from "./validators"
import { resolveBrandAccess } from "./brand-access"

/**
 * GET /store/brands — merken beheerbaar door ingelogde seller/partner.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brands = await listManageableBrands(req.scope, seller)
  res.status(200).json({ brands, count: brands.length })
}

/**
 * POST /store/brands — create brand for own partner account.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  if (
    !hasPermission(seller, "brands.manage") &&
    !hasPermission(seller, "products.manage")
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen rechten om merken aan te maken."
    )
  }
  if (!seller.company_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen partnerbedrijf gekoppeld."
    )
  }
  const body = StoreCreateBrandBody.parse(
    (req as { validatedBody?: unknown }).validatedBody ?? req.body ?? {}
  )
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  let saved
  try {
    saved = await createOwnedBrandForSeller(partner, seller, {
      name: body.name,
      intro: body.intro,
    })
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      err instanceof Error ? err.message : "Merk kon niet worden opgeslagen."
    )
  }
  if (!saved?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Merk kon niet worden opgeslagen."
    )
  }
  const access = await resolveBrandAccess(req.scope, seller, {
    ...saved,
    owner_company_id: seller.company_id,
  })
  res.status(200).json({
    brand: {
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
      intro: saved.intro ?? null,
      access_level: access.level === "none" ? "market" : access.level,
      product_count: 0,
      facility_count: 0,
      can_edit_description: access.can_edit_description,
      can_edit_facilities: access.can_edit_facilities,
      can_manage_public_page: access.can_manage_public_page,
      public_page_status: "unpublished",
      ownership_status: null,
      page_flow_status: "Niet aangevraagd",
      page_review_status: "draft",
      claimed: false,
      editor_scope: "Iedere seller met dit merk (niet geclaimd)",
    },
  })
}
