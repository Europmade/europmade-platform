import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import {
  formatProductManagerLabel,
  isRealBrandId,
  normalizeProductManagerKind,
  resolveOfferSellerIdsForProduct,
} from "../../../../../../modules/product-cloud/catalog-edit-auth"
import {
  assertValidProductManagerAssignment,
  buildProductManagerSnapshot,
} from "../../../../../../modules/product-cloud/product-manager-assignment"
import {
  approvedOwnerClaim,
  brandOwnerCompanyId,
  type BrandPublicRow,
} from "../../../../../store/brands/ownership"

type RouteParams = { id: string }

const BodySchema = z.object({
  kind: z.enum(["seller", "brand_owner", "none"]),
  seller_id: z.string().trim().min(1).nullable().optional(),
  transfer_reason: z.string().trim().max(2000).nullable().optional(),
})

async function resolveSellerDisplayName(
  partner: PartnerModuleService,
  sellerId: string
): Promise<string> {
  try {
    const seller = await partner.retrieveSeller(sellerId, {
      relations: ["company"],
    })
    const company = seller.company as { legal_name?: string } | undefined
    return company?.legal_name?.trim() || sellerId
  } catch {
    return sellerId
  }
}

async function buildProductManagementPayload(
  req: AuthenticatedMedusaRequest,
  productId: string
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }

  const product = await productCloud.retrieveProduct(productId)
  const kind = normalizeProductManagerKind(
    (product as { product_manager_kind?: string }).product_manager_kind
  )
  const managerSellerId =
    (product as { product_manager_seller_id?: string | null })
      .product_manager_seller_id || null

  const offerSellerIds = await resolveOfferSellerIdsForProduct(
    productCloud,
    commerce,
    productId
  )

  const offer_sellers: Array<{ seller_id: string; label: string }> = []
  for (const sid of offerSellerIds) {
    offer_sellers.push({
      seller_id: sid,
      label: await resolveSellerDisplayName(partner, sid),
    })
  }

  let brand_id: string | null = isRealBrandId(product.brand_id)
    ? product.brand_id
    : null
  let brand_name: string | null = null
  let brand_owner: {
    seller_id: string | null
    company_id: string | null
    label: string
  } | null = null

  if (brand_id) {
    try {
      const brand = (await partner.retrieveBrand(brand_id)) as BrandPublicRow & {
        id: string
        name?: string
      }
      brand_name = brand.name?.trim() || brand_id
      const claim = await approvedOwnerClaim(partner, brand_id)
      if (claim) {
        const ownerLabel = claim.seller_id
          ? await resolveSellerDisplayName(partner, claim.seller_id)
          : brandOwnerCompanyId(brand) || "Merkeigenaar"
        brand_owner = {
          seller_id: claim.seller_id || null,
          company_id: claim.company_id || brandOwnerCompanyId(brand),
          label: ownerLabel,
        }
      }
    } catch {
      brand_name = brand_id
    }
  }

  const managerSellerName =
    kind === "seller" && managerSellerId
      ? await resolveSellerDisplayName(partner, managerSellerId)
      : null

  const current = buildProductManagerSnapshot({
    kind,
    seller_id: managerSellerId,
    seller_name: managerSellerName,
    brand_id,
    brand_name:
      kind === "brand_owner"
        ? brand_owner
          ? `${brand_name || brand_id} (${brand_owner.label})`
          : brand_name
        : brand_name,
  })

  const candidates: Array<{
    kind: "seller" | "brand_owner" | "none"
    seller_id: string | null
    label: string
  }> = [
    { kind: "none", seller_id: null, label: formatProductManagerLabel("none") },
  ]
  if (brand_owner && brand_id) {
    candidates.push({
      kind: "brand_owner",
      seller_id: brand_owner.seller_id,
      label: `Merkeigenaar — ${brand_name || brand_id} (${brand_owner.label})`,
    })
  }
  for (const s of offer_sellers) {
    candidates.push({
      kind: "seller",
      seller_id: s.seller_id,
      label: `Seller — ${s.label}`,
    })
  }

  const fieldChanges = await productCloud.listProductFieldChanges(
    { product_id: productId, field_code: "product_manager" },
    { order: { created_at: "DESC" }, take: 20 }
  )

  return {
    current,
    offer_sellers,
    brand_owner,
    brand_id,
    brand_name,
    candidates,
    history: fieldChanges,
  }
}

/**
 * GET /admin/product-cloud/products/:id/product-manager
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const payload = await buildProductManagementPayload(req, id)
  res.json({ product_management: payload })
}

/**
 * PUT /admin/product-cloud/products/:id/product-manager
 * Assign explicit Productbeheerder (seller with offer | brand owner | none).
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message || "Ongeldige Productbeheerder-keuze."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService

  const product = await productCloud.retrieveProduct(id)
  const offerSellerIds = await resolveOfferSellerIdsForProduct(
    productCloud,
    commerce,
    id
  )

  let brandOwnerAvailable = false
  if (isRealBrandId(product.brand_id)) {
    const claim = await approvedOwnerClaim(partner, product.brand_id)
    brandOwnerAvailable = Boolean(claim)
  }

  try {
    assertValidProductManagerAssignment({
      kind: parsed.data.kind,
      seller_id: parsed.data.seller_id,
      offerSellerIds,
      brandOwnerAvailable,
    })
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : "Ongeldige Productbeheerder."
    )
  }

  await productCloud.assignProductManager({
    product_id: id,
    kind: parsed.data.kind,
    seller_id: parsed.data.seller_id ?? null,
    actor_admin_id: req.auth_context?.actor_id ?? null,
    transfer_reason: parsed.data.transfer_reason ?? null,
  })

  const payload = await buildProductManagementPayload(req, id)
  res.json({ product_management: payload })
}
