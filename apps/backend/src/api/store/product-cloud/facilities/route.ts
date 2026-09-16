import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../resolve-seller"
import { listManageableBrands } from "../../brands/brand-helpers"

/**
 * GET /store/product-cloud/facilities
 * Production facilities for brands the seller can manage (existing production_facility).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brands = await listManageableBrands(req.scope, seller)
  const brandMap = new Map(brands.map((b) => [b.id, b]))
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const products = (await productCloud.listProducts(
    { current_owner_seller_id: seller.id },
    { take: 300 }
  )) as Array<{ brand_id?: string }>
  for (const product of products) {
    const brandId = product.brand_id
    if (!brandId || brandMap.has(brandId)) continue
    brandMap.set(brandId, {
      id: brandId,
      name: brandId,
      slug: brandId,
      access_level: "prepare",
    })
  }

  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const allRows = (await partner.listProductionFacilities(
    {},
    { take: 500 }
  )) as Array<Record<string, unknown>>
  const facilities: Array<Record<string, unknown>> = []
  const seen = new Set<string>()
  for (const row of allRows) {
    const brandId = String(row.brand_id || "")
    const brand = brandMap.get(brandId)
    if (!brand) continue
    const id = String(row.id || "")
    if (!id || seen.has(id)) continue
    seen.add(id)
    facilities.push({
      ...row,
      brand_id: brand.id,
      brand_name: brand.name,
    })
  }
  res.json({
    brands: [...brandMap.values()],
    facilities,
    count: facilities.length,
  })
}
