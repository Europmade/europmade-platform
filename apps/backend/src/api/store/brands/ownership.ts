import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { AUDIT_MODULE } from "../../../modules/audit"
import type AuditModuleService from "../../../modules/audit/service"

export const OWNERSHIP_STATUS = {
  INGEDIEND: "Ingediend",
  IN_BEOORDELING: "In beoordeling",
  INFO: "Aanvullende informatie vereist",
  GOEDGEKEURD: "Goedgekeurd",
  AFGEKEURD: "Afgekeurd",
} as const

export type OwnershipStatus =
  (typeof OWNERSHIP_STATUS)[keyof typeof OWNERSHIP_STATUS]

export type BrandOwnershipClaimRow = {
  id: string
  brand_id: string
  seller_id: string
  company_id: string
  evidence_file_id?: string | null
  evidence_url?: string | null
  evidence_note?: string | null
  status: string
  review_note?: string | null
  reviewed_by?: string | null
  reviewed_at?: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

export type BrandPublicRow = {
  id: string
  owner_company_id?: string | null
  owner_company?: { id?: string } | null
  created_by_seller_id?: string | null
  public_page_status?: string | null
}

export function brandOwnerCompanyId(brand: BrandPublicRow): string | null {
  return (
    brand.owner_company_id ??
    (brand.owner_company as { id?: string } | undefined)?.id ??
    null
  )
}

export function isBrandPublicPagePublished(brand: BrandPublicRow): boolean {
  return brand.public_page_status === "published"
}

export async function listClaimsForBrand(
  partner: PartnerModuleService,
  brandId: string
): Promise<BrandOwnershipClaimRow[]> {
  try {
    return (await partner.listBrandOwnershipClaims(
      { brand_id: brandId },
      { take: 50, order: { created_at: "DESC" } }
    )) as BrandOwnershipClaimRow[]
  } catch {
    return []
  }
}

export async function listClaimsForSellerBrand(
  partner: PartnerModuleService,
  brandId: string,
  sellerId: string
): Promise<BrandOwnershipClaimRow[]> {
  try {
    return (await partner.listBrandOwnershipClaims(
      { brand_id: brandId, seller_id: sellerId },
      { take: 20, order: { created_at: "DESC" } }
    )) as BrandOwnershipClaimRow[]
  } catch {
    return []
  }
}

export function latestClaim(
  rows: BrandOwnershipClaimRow[]
): BrandOwnershipClaimRow | null {
  return rows[0] ?? null
}

export async function isVerifiedBrandOwner(
  partner: PartnerModuleService,
  seller: { id: string; company_id?: string | null },
  brand: BrandPublicRow
): Promise<boolean> {
  const claims = await listClaimsForSellerBrand(partner, brand.id, seller.id)
  if (claims.some((c) => c.status === OWNERSHIP_STATUS.GOEDGEKEURD)) {
    return true
  }
  return false
}

export async function sellerMayFileOwnershipClaim(
  partner: PartnerModuleService,
  seller: { id: string; company_id?: string | null },
  brand: BrandPublicRow
): Promise<boolean> {
  if (brand.created_by_seller_id && brand.created_by_seller_id === seller.id) {
    return true
  }
  const companyId = seller.company_id ?? null
  const ownerId = brandOwnerCompanyId(brand)
  if (companyId && ownerId && companyId === ownerId) return true
  return false
}

export async function brandHasApprovedOwner(
  partner: PartnerModuleService,
  brandId: string
): Promise<boolean> {
  const claims = await listClaimsForBrand(partner, brandId)
  return claims.some((c) => c.status === OWNERSHIP_STATUS.GOEDGEKEURD)
}

export async function approvedOwnerClaim(
  partner: PartnerModuleService,
  brandId: string
): Promise<BrandOwnershipClaimRow | null> {
  const claims = await listClaimsForBrand(partner, brandId)
  return claims.find((c) => c.status === OWNERSHIP_STATUS.GOEDGEKEURD) ?? null
}

export async function appendOwnershipAudit(
  scope: { resolve: (key: string) => unknown },
  input: {
    actor_id?: string | null
    claim_id: string
    action: string
    reason?: string | null
  }
) {
  try {
    const audit = scope.resolve(AUDIT_MODULE) as AuditModuleService
    await audit.append({
      actor_customer_id: input.actor_id ?? null,
      entity_type: "brand_ownership_claim",
      entity_id: input.claim_id,
      action_type: input.action,
      reason: input.reason ?? null,
    })
  } catch {
    /* audit module optional in some test scopes */
  }
}

export function assertReviewNote(note: string | undefined, label: string) {
  const trimmed = note?.trim() ?? ""
  if (!trimmed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} is verplicht.`
    )
  }
  return trimmed
}

export function resolveBrandPageFlowStatus(input: {
  ownership_status?: string | null
  public_page_status?: string | null
  page_review_status?: string | null
}): string {
  if (
    input.public_page_status === "published" &&
    input.page_review_status !== "in_review" &&
    input.page_review_status !== "info_requested"
  ) {
    return "Gepubliceerd"
  }
  if (input.page_review_status === "in_review") return "In beoordeling"
  if (input.page_review_status === "info_requested") return "Aanvulling gevraagd"
  const own = input.ownership_status || ""
  if (own === OWNERSHIP_STATUS.GOEDGEKEURD) return "Goedgekeurd"
  if (own === OWNERSHIP_STATUS.INFO) return "Aanvulling gevraagd"
  if (own === OWNERSHIP_STATUS.INGEDIEND || own === OWNERSHIP_STATUS.IN_BEOORDELING) {
    return "In beoordeling"
  }
  return "Niet aangevraagd"
}
