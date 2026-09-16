import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../../../../../../modules/verification"
import type VerificationModuleService from "../../../../../../../modules/verification/service"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"
import { resolveBrandAccess } from "../../../../brand-access"
import { loadBrandOrThrow } from "../../../../brand-helpers"

type RouteParams = { id: string; facilityId: string }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id, facilityId } = req.params as RouteParams
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const brand = await loadBrandOrThrow(req.scope, id)
  const access = await resolveBrandAccess(req.scope, seller, brand)
  if (access.level === "none") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Geen toegang tot dit merk.")
  }

  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const facility = await partner.retrieveProductionFacility(facilityId)
  if (facility.brand_id !== brand.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze productielocatie hoort bij een ander merk."
    )
  }

  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const origins = (await verification.listProductOrigins(
    { production_facility_id: facilityId },
    { take: 500 }
  )) as Array<{ product_version_id?: string }>

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const ownProducts = (await productCloud.listProducts(
    { current_owner_seller_id: seller.id, brand_id: brand.id },
    { take: 500 }
  )) as Array<{
    id: string
    brand_id: string
    title?: string | null
    manufacturer_id?: string | null
  }>

  const versionIds = new Set(origins.map((o) => o.product_version_id).filter(Boolean))
  const products = []
  for (const product of ownProducts) {
    const versions = (await productCloud.listProductVersions(
      { product_id: product.id },
      { order: { version_number: "DESC" }, take: 1 }
    )) as Array<{ id: string; title?: string | null }>
    const latest = versions[0]
    if (!latest || !versionIds.has(latest.id)) continue
    products.push({
      id: product.id,
      title: latest.title ?? product.title ?? product.id,
      brand_id: product.brand_id,
      manufacturer_id: product.manufacturer_id ?? null,
      ean: (product as { identifier_value?: string | null }).identifier_value ?? null,
      sku: (product as { sku_hint?: string | null }).sku_hint ?? null,
      brand_name: brand.name ?? null,
      status: (product as { lifecycle_status?: string | null }).lifecycle_status ?? null,
    })
  }

  res.status(200).json({
    brand: { id: brand.id, name: brand.name ?? brand.id },
    facility: {
      id: facility.id,
      name: facility.name,
      country_code: facility.country_code,
      city: (facility as { city?: string | null }).city ?? null,
    },
    products,
    count: products.length,
  })
}
