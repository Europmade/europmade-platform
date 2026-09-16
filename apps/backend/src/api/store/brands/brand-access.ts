import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { hasPermission } from "../../../modules/partner/permissions"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { isVerifiedBrandOwner, brandHasApprovedOwner } from "./ownership"

export type BrandAccessLevel = "none" | "prepare" | "market" | "central"

export type BrandAccess = {
  level: BrandAccessLevel
  can_edit_central: boolean
  can_edit_markets: string[]
  can_edit_facilities: boolean
  can_edit_description: boolean
  can_manage_public_page: boolean
}

type SellerRow = {
  id: string
  company_id?: string | null
  is_retailer?: boolean
  is_producer_or_brand_owner?: boolean
  is_brand_owner?: boolean
  is_producer?: boolean
  is_distributor?: boolean
  onboarding_status?: string
  company?: { country_code?: string } | null
}

type BrandRow = {
  id: string
  owner_company_id?: string | null
  owner_company?: { id?: string; country_code?: string } | null
  created_by_seller_id?: string | null
  public_page_status?: string | null
}

async function sellerHasBrandProducts(
  productCloud: ProductCloudModuleService,
  sellerId: string,
  brandId: string
): Promise<boolean> {
  const products = (await productCloud.listProducts(
    { current_owner_seller_id: sellerId },
    { take: 200 }
  )) as Array<{ brand_id?: string }>
  return products.some((p) => p.brand_id === brandId)
}

async function hasApprovedOfficialOwner(
  partner: PartnerModuleService,
  ownerCompanyId: string | null | undefined
): Promise<boolean> {
  if (!ownerCompanyId) return false
  const sellers = (await partner.listSellers(
    { company_id: ownerCompanyId, onboarding_status: "Goedgekeurd" },
    { take: 20 }
  )) as SellerRow[]
  return sellers.some(
    (s) =>
      s.is_producer_or_brand_owner === true || s.is_brand_owner === true
  )
}

function withDescriptionAndFacilities(
  access: Omit<
    BrandAccess,
    | "can_edit_description"
    | "can_edit_facilities"
    | "can_edit_central"
    | "can_manage_public_page"
  > & {
    can_edit_central?: boolean
    can_edit_facilities?: boolean
    can_manage_public_page?: boolean
  },
  seller: SellerRow
): BrandAccess {
  const canEditDescription = hasPermission(seller, "brands.edit_description")
  const canEditFacilities = hasPermission(seller, "facilities.manage")
  const wantsCentral = access.can_edit_central === true
  const wantsFacilities = access.can_edit_facilities !== false
  const wantsPublic = access.can_manage_public_page === true
  return {
    level: access.level,
    can_edit_markets: access.can_edit_markets,
    can_edit_central: wantsPublic && canEditDescription,
    can_edit_description:
      (wantsCentral || wantsPublic) && canEditDescription,
    can_edit_facilities: wantsFacilities && canEditFacilities,
    can_manage_public_page: wantsPublic,
  }
}

/**
 * Rechtenmodel merkcontent — producent > merkhouder per land > seller (voorbereiden).
 * Permission-laag (ADR-0041) bepaalt of description/facilities écht bewerkbaar zijn.
 */
export async function resolveBrandAccess(
  scope: { resolve: (key: string) => unknown },
  seller: SellerRow,
  brand: BrandRow
): Promise<BrandAccess> {
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const companyId = seller.company_id ?? null
  const ownerCompanyId =
    brand.owner_company_id ??
    (brand.owner_company as { id?: string } | undefined)?.id ??
    null

  const marketRows = (await partner.listBrandMarketContents(
    { brand_id: brand.id },
    { take: 50 }
  )) as Array<{ country_code?: string; managed_by_company_id?: string | null }>

  const editableMarkets: string[] = []
  for (const row of marketRows) {
    const cc = row.country_code?.trim().toUpperCase()
    if (!cc) continue
    if (row.managed_by_company_id && row.managed_by_company_id === companyId) {
      editableMarkets.push(cc)
    }
  }

  const ownerCompanyCountry =
    brand.owner_company?.country_code?.trim().toUpperCase() ?? null

  const ownsBrand = Boolean(
    companyId && ownerCompanyId && companyId === ownerCompanyId
  )
  const createdBrand = Boolean(
    seller.id &&
      brand.created_by_seller_id &&
      brand.created_by_seller_id === seller.id
  )
  const verifiedOwner = await isVerifiedBrandOwner(partner, seller, brand)
  const exclusiveClaimed = await brandHasApprovedOwner(partner, brand.id)
  const hasProducts = await sellerHasBrandProducts(
    productCloud,
    seller.id,
    brand.id
  )
  const canEditPage = exclusiveClaimed
    ? verifiedOwner
    : ownsBrand || createdBrand || hasProducts
  const producerOrOwner = Boolean(
    seller.is_producer_or_brand_owner ||
      seller.is_brand_owner ||
      seller.is_producer
  )

  if ((ownsBrand || createdBrand) && producerOrOwner) {
    if (ownerCompanyCountry && !editableMarkets.includes(ownerCompanyCountry)) {
      editableMarkets.push(ownerCompanyCountry)
    }
    for (const row of marketRows) {
      const cc = row.country_code?.trim().toUpperCase()
      if (cc && !editableMarkets.includes(cc)) editableMarkets.push(cc)
    }
    return withDescriptionAndFacilities(
      {
        level: verifiedOwner ? "central" : "prepare",
        can_edit_central: true,
        can_manage_public_page: canEditPage,
        can_edit_markets: editableMarkets,
        can_edit_facilities: true,
      },
      seller
    )
  }

  if (ownsBrand || createdBrand) {
    if (
      ownerCompanyCountry &&
      !editableMarkets.includes(ownerCompanyCountry)
    ) {
      editableMarkets.push(ownerCompanyCountry)
    }
    return withDescriptionAndFacilities(
      {
        level: "market",
        can_edit_central: true,
        can_manage_public_page: canEditPage,
        can_edit_markets: editableMarkets,
        can_edit_facilities: false,
      },
      seller
    )
  }

  if (companyId) {
    for (const row of marketRows) {
      const cc = row.country_code?.trim().toUpperCase()
      if (
        cc &&
        row.managed_by_company_id === companyId &&
        !editableMarkets.includes(cc)
      ) {
        editableMarkets.push(cc)
      }
    }
    if (editableMarkets.length > 0) {
      return withDescriptionAndFacilities(
        {
          level: "market",
          can_edit_central: false,
          can_manage_public_page: canEditPage,
          can_edit_markets: editableMarkets,
          can_edit_facilities: false,
        },
        seller
      )
    }
  }

  const officialOwner = await hasApprovedOfficialOwner(partner, ownerCompanyId)
  if (!officialOwner && hasProducts) {
    return withDescriptionAndFacilities(
      {
        level: "prepare",
        can_edit_central: true,
        can_manage_public_page: canEditPage,
        can_edit_markets: [],
        can_edit_facilities: true,
      },
      seller
    )
  }
  if (hasProducts) {
    return withDescriptionAndFacilities(
      {
        level: "prepare",
        can_edit_central: false,
        can_manage_public_page: canEditPage,
        can_edit_markets: editableMarkets,
        can_edit_facilities: true,
      },
      seller
    )
  }

  return {
    level: "none",
    can_edit_central: false,
    can_edit_markets: [],
    can_edit_facilities: false,
    can_edit_description: false,
    can_manage_public_page: false,
  }
}

export async function assertBrandCentralEdit(
  scope: { resolve: (key: string) => unknown },
  seller: SellerRow,
  brand: BrandRow
): Promise<BrandAccess> {
  const access = await resolveBrandAccess(scope, seller, brand)
  if (!access.can_edit_description && !access.can_edit_central) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen rechten om de merkbeschrijving te bewerken."
    )
  }
  return access
}

export async function assertBrandMarketEdit(
  scope: { resolve: (key: string) => unknown },
  seller: SellerRow,
  brand: BrandRow,
  countryCode: string
): Promise<BrandAccess> {
  const access = await resolveBrandAccess(scope, seller, brand)
  const cc = countryCode.trim().toUpperCase()
  if (!access.can_edit_markets.includes(cc)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Geen rechten om merkcontent voor ${cc} te bewerken.`
    )
  }
  return access
}

export async function assertBrandFacilityEdit(
  scope: { resolve: (key: string) => unknown },
  seller: SellerRow,
  brand: BrandRow
): Promise<BrandAccess> {
  const access = await resolveBrandAccess(scope, seller, brand)
  if (!access.can_edit_facilities) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen rechten om productielocaties te bewerken."
    )
  }
  return access
}

export async function assertBrandPublicPageEdit(
  scope: { resolve: (key: string) => unknown },
  seller: SellerRow,
  brand: BrandRow
): Promise<BrandAccess> {
  const access = await resolveBrandAccess(scope, seller, brand)
  if (!access.can_manage_public_page) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen een bevoegde seller mag deze merkpagina voorbereiden."
    )
  }
  return access
}

export function storefrontLocaleToMarketCountry(
  locale: string | undefined
): string {
  switch ((locale ?? "nl").toLowerCase().slice(0, 2)) {
    case "en":
      return "GB"
    case "de":
      return "DE"
    case "fr":
      return "FR"
    default:
      return "NL"
  }
}
