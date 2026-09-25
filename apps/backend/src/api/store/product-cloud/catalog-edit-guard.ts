import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import {
  catalogEditDeniedMessage,
  evaluateCatalogDirectEditAccess,
  isRealBrandId,
  resolveOfferSellerIdsForProduct,
  type CatalogEditReason,
} from "../../../modules/product-cloud/catalog-edit-auth"
import {
  brandOwnerCompanyId,
  isVerifiedBrandOwner,
  type BrandPublicRow,
} from "../brands/ownership"

export async function resolveIsVerifiedBrandOwnerForProduct(
  partner: PartnerModuleService | null,
  seller: { id: string; company_id?: string | null },
  brandId: string | null | undefined
): Promise<boolean> {
  if (!partner || !isRealBrandId(brandId)) return false
  try {
    const brand = (await partner.retrieveBrand(brandId!)) as BrandPublicRow & {
      id: string
    }
    if (await isVerifiedBrandOwner(partner, seller, brand)) return true
    const ownerCompany = brandOwnerCompanyId(brand)
    return Boolean(
      seller.company_id && ownerCompany && seller.company_id === ownerCompany
    )
  } catch {
    return false
  }
}

export async function sellerCanDirectEditCatalog(
  scope: MedusaContainer,
  product: {
    id: string
    brand_id?: string | null
    current_owner_seller_id?: string | null
    product_manager_kind?: string | null
    product_manager_seller_id?: string | null
  },
  seller: { id: string; company_id?: string | null },
  preloaded?: {
    offerSellerIds?: string[]
    isBrandOwner?: boolean
  }
): Promise<{ allowed: boolean; reason: CatalogEditReason }> {
  let partner: PartnerModuleService | null = null
  try {
    partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  } catch {
    partner = null
  }

  const isBrandOwner =
    preloaded?.isBrandOwner ??
    (await resolveIsVerifiedBrandOwnerForProduct(
      partner,
      seller,
      product.brand_id
    ))

  return evaluateCatalogDirectEditAccess({
    actorSellerId: seller.id,
    productManagerKind: product.product_manager_kind,
    productManagerSellerId: product.product_manager_seller_id,
    isBrandOwner,
  })
}

export async function assertSellerCanDirectEditCatalog(
  scope: MedusaContainer,
  product: {
    id: string
    brand_id?: string | null
    current_owner_seller_id?: string | null
    product_manager_kind?: string | null
    product_manager_seller_id?: string | null
  },
  seller: { id: string; company_id?: string | null }
): Promise<void> {
  const result = await sellerCanDirectEditCatalog(scope, product, seller)
  if (result.allowed) return
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    catalogEditDeniedMessage(result.reason)
  )
}

/** Offer seller may fill blank central fields only (not overwrite). */
export async function sellerHasOfferOnProduct(
  scope: MedusaContainer,
  productId: string,
  sellerId: string
): Promise<boolean> {
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  const offerSellerIds = await resolveOfferSellerIdsForProduct(
    productCloud,
    commerce,
    productId
  )
  return offerSellerIds.includes(sellerId)
}
