import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import {
  assertBrandCentralEdit,
  assertBrandFacilityEdit,
  resolveBrandAccess,
} from "../brand-access"
import { loadBrandOrThrow } from "../brand-helpers"
import { StorePatchBrandBody } from "../validators"

type RouteParams = { id: string }

/**
 * GET /store/brands/:id — merkdetail + rechten voor seller-backoffice.
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
  const marketRows = await partner.listBrandMarketContents(
    { brand_id: brand.id },
    { take: 50 }
  )
  const facilities = await partner.listProductionFacilities(
    { brand_id: brand.id },
    { take: 50 }
  )

  res.status(200).json({
    brand,
    access,
    market_content: marketRows,
    facilities,
  })
}

/**
 * PATCH /store/brands/:id — centrale merkcontent (rechten afhankelijk van rol).
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  await assertBrandCentralEdit(req.scope, seller, brand)

  const body = StorePatchBrandBody.parse(req.body)
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService

  let updated
  try {
    updated = await partner.updateBrands({
      id: brand.id,
      ...body,
    })
  } catch {
    if (!brand.id.startsWith("brand_")) {
      const [created] = await partner.createBrands([
        {
          name: brand.name ?? brand.id,
          slug: brand.slug ?? undefined,
          owner_company_id: seller.company_id ?? undefined,
          ...body,
        },
      ])
      updated = created
    } else {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Merk kan niet worden bijgewerkt."
      )
    }
  }

  res.status(200).json({ brand: updated })
}
