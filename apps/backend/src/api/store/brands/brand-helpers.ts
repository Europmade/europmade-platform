import type { MedusaRequest } from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { resolveBrandAccess } from "./brand-access"
import { slugifyCatalogEntityName } from "../catalog/catalog-helpers"
import {
  latestClaim,
  listClaimsForSellerBrand,
  approvedOwnerClaim,
  resolveBrandPageFlowStatus,
} from "./ownership"

export type ManageableBrand = {
  id: string
  name: string
  slug: string
  intro: string | null
  access_level: string
  product_count: number
  facility_count: number
  can_edit_description: boolean
  can_edit_facilities: boolean
  can_manage_public_page: boolean
  public_page_status: string
  ownership_status: string | null
  page_flow_status: string
  page_review_status: string
  claimed: boolean
  editor_scope: string
}

export async function listFacilitiesForBrand(
  partner: PartnerModuleService,
  brandId: string
) {
  const all = (await partner.listProductionFacilities(
    {},
    { take: 500 }
  )) as Array<Record<string, unknown> & { brand_id?: string; is_active?: boolean }>
  return all.filter((row) => row.brand_id === brandId)
}

function unwrapCreatedBrand<T extends { id?: string }>(
  created: T | T[] | null | undefined
): T | null {
  if (!created) return null
  const row = Array.isArray(created) ? created[0] : created
  return row?.id ? row : null
}

function brandOwnerCompanyId(brand: {
  owner_company_id?: string | null
  owner_company?: { id?: string } | null
}): string | null {
  return (
    brand.owner_company_id ??
    (brand.owner_company as { id?: string } | undefined)?.id ??
    null
  )
}

export async function createOwnedBrandForSeller(
  partner: PartnerModuleService,
  seller: { id: string; company_id: string },
  input: { name: string; intro?: string | null }
) {
  const name = input.name.trim()
  const payload = {
    name,
    slug: slugifyCatalogEntityName(name),
    intro: input.intro?.trim() || null,
    owner_company_id: seller.company_id,
    owner_company: seller.company_id,
    created_by_seller_id: seller.id,
    public_page_status: "unpublished",
  }
  let created: { id?: string } | null = null
  try {
    created = unwrapCreatedBrand(await partner.createBrands([payload]))
  } catch {
    created = unwrapCreatedBrand(
      await partner.createBrands([
        {
          name,
          slug: slugifyCatalogEntityName(name),
          intro: input.intro?.trim() || null,
          owner_company_id: seller.company_id,
          created_by_seller_id: seller.id,
          public_page_status: "unpublished",
        },
      ])
    )
  }
  if (!created?.id) {
    throw new Error("Merk kon niet worden opgeslagen.")
  }

  type SavedBrand = {
    id: string
    name?: string
    slug?: string | null
    intro?: string | null
    owner_company_id?: string | null
    owner_company?: { id?: string } | null
  }
  let saved: SavedBrand = created as SavedBrand
  try {
    saved = (await partner.retrieveBrand(created.id, {
      relations: ["owner_company"],
    })) as SavedBrand
  } catch {
    try {
      saved = (await partner.retrieveBrand(created.id)) as SavedBrand
    } catch {
      /* keep created row */
    }
  }

  if (brandOwnerCompanyId(saved) !== seller.company_id) {
    try {
      const updated = unwrapCreatedBrand(
        await partner.updateBrands({
          id: created.id,
          owner_company_id: seller.company_id,
          owner_company: seller.company_id,
        })
      )
      if (updated) saved = updated as SavedBrand
    } catch {
      /* listing still treats this company as owner when the row is returned */
    }
  }

  return saved
}

export async function persistBrandRecord(
  partner: PartnerModuleService,
  brand: {
    id: string
    name?: string | null
    slug?: string | null
  },
  extra: Record<string, unknown> = {}
) {
  const payload = {
    name: brand.name?.trim() || brand.id,
    slug: brand.slug?.trim() || slugifyCatalogEntityName(brand.name || brand.id),
    ...extra,
  }
  if (typeof extra.name === "string" && extra.slug == null) {
    payload.slug = slugifyCatalogEntityName(extra.name)
  }

  try {
    return await partner.updateBrands({
      id: brand.id,
      ...payload,
    })
  } catch {
    try {
      const created = await partner.createBrands([
        {
          id: brand.id,
          ...payload,
        },
      ])
      return Array.isArray(created) ? created[0] : created
    } catch {
      const created = await partner.createBrands([payload])
      return Array.isArray(created) ? created[0] : created
    }
  }
}

export async function listManageableBrands(
  scope: MedusaRequest["scope"],
  seller: {
    id: string
    company_id?: string | null
    is_producer_or_brand_owner?: boolean
    is_brand_owner?: boolean
    is_producer?: boolean
    is_retailer?: boolean
    is_distributor?: boolean
  }
): Promise<ManageableBrand[]> {
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
      intro: string | null
      access_level: string
      can_edit_description: boolean
      can_edit_facilities: boolean
      can_manage_public_page: boolean
      public_page_status: string
      ownership_status: string | null
      page_flow_status: string
      page_review_status: string
      claimed: boolean
      editor_scope: string
    }
  >()

  async function addBrand(brand: {
    id: string
    name?: string
    slug?: string | null
    intro?: string | null
    owner_company_id?: string | null
    owner_company?: { id?: string } | null
    created_by_seller_id?: string | null
    public_page_status?: string | null
    page_review_status?: string | null
  }) {
    const name = brand.name?.trim()
    if (!name || byId.has(brand.id)) return
    const access = await resolveBrandAccess(scope, seller, {
      ...brand,
      owner_company_id:
        brandOwnerCompanyId(brand) ?? seller.company_id ?? null,
    })
    if (access.level === "none") return
    const claims = await listClaimsForSellerBrand(partner, brand.id, seller.id)
    const ownership_status = latestClaim(claims)?.status ?? null
    const public_page_status = brand.public_page_status ?? "unpublished"
    const page_review_status = brand.page_review_status ?? "draft"
    const approved = await approvedOwnerClaim(partner, brand.id)
    byId.set(brand.id, {
      id: brand.id,
      name,
      slug: brand.slug?.trim() || slugifyCatalogEntityName(name),
      intro: brand.intro ?? null,
      access_level: access.level,
      can_edit_description: access.can_edit_description,
      can_edit_facilities: access.can_edit_facilities,
      can_manage_public_page: access.can_manage_public_page,
      public_page_status,
      ownership_status,
      page_review_status,
      claimed: Boolean(approved),
      editor_scope: approved
        ? "Alleen de geverifieerde merkeigenaar"
        : "Iedere seller met dit merk (niet geclaimd)",
      page_flow_status: resolveBrandPageFlowStatus({
        ownership_status,
        public_page_status,
        page_review_status,
      }),
    })
  }

  if (seller.company_id) {
    let owned: Array<{
      id: string
      name?: string
      slug?: string | null
      intro?: string | null
      owner_company_id?: string | null
      owner_company?: { id?: string } | null
      created_by_seller_id?: string | null
      public_page_status?: string | null
    }> = []
    try {
      owned = (await partner.listBrands(
        { owner_company_id: seller.company_id },
        { take: 200, relations: ["owner_company"] }
      )) as typeof owned
    } catch {
      owned = (await partner.listBrands(
        { owner_company_id: seller.company_id },
        { take: 200 }
      )) as typeof owned
    }
    for (const brand of owned) await addBrand(brand)
  }

  try {
    const created = (await partner.listBrands(
      { created_by_seller_id: seller.id },
      { take: 200 }
    )) as Array<{
      id: string
      name?: string
      slug?: string | null
      intro?: string | null
      created_by_seller_id?: string | null
      public_page_status?: string | null
    }>
    for (const brand of created) await addBrand(brand)
  } catch {
    /* column may be missing before migrate */
  }

  const products = (await productCloud.listProducts(
    { current_owner_seller_id: seller.id },
    { take: 300 }
  )) as Array<{ brand_id?: string }>
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))]

  for (const brandId of brandIds) {
    if (!brandId || byId.has(brandId)) continue
    let brand: {
      id: string
      name?: string
      slug?: string | null
      intro?: string | null
      public_page_status?: string | null
    }
    try {
      brand = await partner.retrieveBrand(brandId)
    } catch {
      brand = {
        id: brandId,
        name: brandId.replace(/^brand_/, "") || brandId,
        slug: slugifyCatalogEntityName(brandId),
        intro: null,
        public_page_status: "unpublished",
      }
    }
    await addBrand(brand)
  }

  const allFacilities = (await partner.listProductionFacilities(
    {},
    { take: 500 }
  )) as Array<{ brand_id?: string }>
  const productCounts = new Map<string, number>()
  for (const product of products) {
    const id = product.brand_id
    if (!id) continue
    productCounts.set(id, (productCounts.get(id) || 0) + 1)
  }

  return [...byId.values()].map((brand) => ({
    ...brand,
    product_count: productCounts.get(brand.id) || 0,
    facility_count: allFacilities.filter((f) => f.brand_id === brand.id)
      .length,
  }))
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
    try {
      return await partner.retrieveBrand(brandId)
    } catch {
      return {
        id: brandId,
        name: brandId,
        slug: slugifyCatalogEntityName(brandId),
        intro: null,
        owner_company_id: null,
        owner_company: null,
      }
    }
  }
}

export { loadBrandOrThrow }
