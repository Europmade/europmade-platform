import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { resolveBrandAccess } from "./brand-access"
import { slugifyCatalogEntityName } from "../catalog/catalog-helpers"

export async function listManageableBrands(
  scope: MedusaRequest["scope"],
  seller: {
    id: string
    company_id?: string | null
    is_producer_or_brand_owner?: boolean
  }
) {
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const byId = new Map<
    string,
    {
      id: string
      name: string
      slug: string
      access_level: string
    }
  >()

  if (seller.company_id) {
    const owned = (await partner.listBrands(
      { owner_company_id: seller.company_id },
      { take: 100 }
    )) as Array<{ id: string; name?: string; slug?: string | null }>
    for (const brand of owned) {
      const name = brand.name?.trim()
      if (!name) continue
      const access = await resolveBrandAccess(scope, seller, brand)
      if (access.level === "none") continue
      byId.set(brand.id, {
        id: brand.id,
        name,
        slug: brand.slug?.trim() || slugifyCatalogEntityName(name),
        access_level: access.level,
      })
    }
  }

  const products = (await productCloud.listProducts(
    { current_owner_seller_id: seller.id },
    { take: 300 }
  )) as Array<{ brand_id?: string }>
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))]

  for (const brandId of brandIds) {
    if (!brandId || byId.has(brandId)) continue
    let brand: { id: string; name?: string; slug?: string | null }
    try {
      brand = await partner.retrieveBrand(brandId)
    } catch {
      const name = brandId.startsWith("brand_") ? null : brandId
      if (!name) continue
      brand = { id: brandId, name, slug: slugifyCatalogEntityName(name) }
    }
    const name = brand.name?.trim()
    if (!name) continue
    const access = await resolveBrandAccess(scope, seller, brand)
    if (access.level === "none") continue
    byId.set(brand.id, {
      id: brand.id,
      name,
      slug: brand.slug?.trim() || slugifyCatalogEntityName(name),
      access_level: access.level,
    })
  }

  return [...byId.values()]
}

async function loadBrandOrThrow(
  scope: MedusaRequest["scope"],
  brandId: string
) {
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  try {
    return await partner.retrieveBrand(brandId, {
      relations: ["owner_company"],
    })
  } catch {
    if (brandId.startsWith("brand_")) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Merk niet gevonden."
      )
    }
    return {
      id: brandId,
      name: brandId,
      slug: slugifyCatalogEntityName(brandId),
      owner_company_id: null,
      owner_company: null,
    }
  }
}

export { loadBrandOrThrow }
