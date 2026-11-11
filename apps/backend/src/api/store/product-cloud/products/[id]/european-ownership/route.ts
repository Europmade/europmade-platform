import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { isRealBrandId } from "../../../../../../modules/product-cloud/catalog-edit-auth"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { VERIFICATION_MODULE } from "../../../../../../modules/verification"
import type VerificationModuleService from "../../../../../../modules/verification/service"
import {
  EUROPEAN_OWNERSHIP_BANDS,
  EUROPEAN_OWNERSHIP_SOURCES,
  isEuropeanOwnershipBand,
  isEuropeanOwnershipSource,
} from "../../../../../../modules/verification/european-ownership"
import { resolveApprovedSeller } from "../../../resolve-seller"
import {
  sellerCanDirectEditCatalog,
  sellerHasOfferOnProduct,
} from "../../../catalog-edit-guard"
import { resolveBrandAccess } from "../../../../brands/brand-access"
import {
  appendOwnershipStatusEvent,
  findClaimByBrand,
  findClaimForProductRefs,
  serializeEuropeanOwnershipClaim,
  statusAfterSellerSubmit,
  type EuropeanOwnershipClaimRow,
} from "../../../european-ownership-helpers"

type RouteParams = { id: string }

const UpsertBody = z.object({
  ownership_band: z.enum(EUROPEAN_OWNERSHIP_BANDS),
  source: z.enum(EUROPEAN_OWNERSHIP_SOURCES).optional(),
  evidence_file_id: z.string().trim().min(1).max(500).nullable().optional(),
  evidence_note: z.string().trim().max(2000).nullable().optional(),
  company_id: z.string().trim().min(1).max(100).nullable().optional(),
})

async function resolveProductBrandRefs(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<{
  brand_id: string | null
  manufacturer_id: string | null
  product: {
    id: string
    brand_id?: string | null
    manufacturer_id?: string | null
    current_owner_seller_id?: string | null
  }
}> {
  const product = (await productCloud.retrieveProduct(productId)) as {
    id: string
    brand_id?: string | null
    manufacturer_id?: string | null
    current_owner_seller_id?: string | null
  }
  const brandId = (product.brand_id || "").trim()
  return {
    brand_id: isRealBrandId(brandId) ? brandId : null,
    manufacturer_id: (product.manufacturer_id || "").trim() || null,
    product,
  }
}

function sellerMayEditBrandEuropeanOwnership(access: {
  can_edit_description?: boolean
  can_edit_central?: boolean
}): boolean {
  return Boolean(access.can_edit_description || access.can_edit_central)
}

/**
 * GET /store/product-cloud/products/:id/european-ownership
 * Brand-level claim for the product's brand (editable when seller may manage the brand).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService

  const { brand_id, manufacturer_id, product } =
    await resolveProductBrandRefs(productCloud, id)

  const access = await sellerCanDirectEditCatalog(req.scope, product, seller)
  const hasOffer = await sellerHasOfferOnProduct(req.scope, id, seller.id)
  if (
    !access.allowed &&
    !hasOffer &&
    product.current_owner_seller_id !== seller.id
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot dit product."
    )
  }

  if (!brand_id) {
    res.json({
      brand_id: null,
      manufacturer_id,
      claim: null,
      history: [],
      inherited_from_brand: false,
      can_edit: false,
      manage_at: null,
    })
    return
  }

  let can_edit = false
  try {
    const brand = await partner.retrieveBrand(brand_id)
    const brandAccess = await resolveBrandAccess(req.scope, seller, brand as never)
    const createdBy =
      (brand as { created_by_seller_id?: string | null }).created_by_seller_id ||
      ""
    can_edit =
      sellerMayEditBrandEuropeanOwnership(brandAccess) || createdBy === seller.id
  } catch {
    can_edit = false
  }

  const claim = await findClaimForProductRefs(verification, {
    brand_id,
    manufacturer_id,
  })
  const events = claim
    ? await verification.listEuropeanOwnershipStatusEvents(
        { claim_id: claim.id },
        { order: { created_at: "DESC" }, take: 50 }
      )
    : []

  res.json({
    brand_id,
    manufacturer_id,
    claim: claim ? serializeEuropeanOwnershipClaim(claim) : null,
    history: events,
    inherited_from_brand: Boolean(claim?.brand_id || claim),
    can_edit,
    manage_at: `/seller/brands/${encodeURIComponent(brand_id)}`,
  })
}

/**
 * PUT /store/product-cloud/products/:id/european-ownership
 * Upserts the brand-level claim (same data as Seller → Merken).
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const parsed = UpsertBody.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige Europese-eigendomgegevens (band)."
    )
  }
  if (!isEuropeanOwnershipBand(parsed.data.ownership_band)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige eigendomsband."
    )
  }
  const source = parsed.data.source || "brand_producer"
  if (!isEuropeanOwnershipSource(source)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige bron."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService

  const { brand_id, product } = await resolveProductBrandRefs(productCloud, id)
  if (!brand_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Koppel eerst een merk om Europese eigendom te beheren."
    )
  }

  const brand = await partner.retrieveBrand(brand_id)
  const brandAccess = await resolveBrandAccess(req.scope, seller, brand as never)
  const createdBy =
    (brand as { created_by_seller_id?: string | null }).created_by_seller_id ||
    ""
  if (
    !sellerMayEditBrandEuropeanOwnership(brandAccess) &&
    createdBy !== seller.id
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag Europese eigendom van dit merk niet wijzigen."
    )
  }

  const catalogAccess = await sellerCanDirectEditCatalog(
    req.scope,
    product,
    seller
  )
  if (
    !catalogAccess.allowed &&
    product.current_owner_seller_id !== seller.id &&
    createdBy !== seller.id
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot dit product."
    )
  }

  const existing = await findClaimByBrand(verification, brand_id)
  const evidenceId =
    parsed.data.evidence_file_id === undefined
      ? undefined
      : parsed.data.evidence_file_id
  const evidenceNote =
    parsed.data.evidence_note === undefined
      ? undefined
      : parsed.data.evidence_note
  const hasEvidence = Boolean(
    (evidenceId !== undefined ? evidenceId : existing?.evidence_file_id) ||
      (evidenceNote !== undefined ? evidenceNote : existing?.evidence_note)
  )
  const nextStatus = statusAfterSellerSubmit(hasEvidence)
  const actor = req.auth_context.actor_id ?? seller.customer_id

  let saved: EuropeanOwnershipClaimRow
  if (existing) {
    saved = (await verification.updateEuropeanOwnershipClaims({
      id: existing.id,
      brand_id,
      manufacturer_id: existing.manufacturer_id ?? null,
      seller_id: seller.id,
      company_id:
        parsed.data.company_id !== undefined
          ? parsed.data.company_id
          : existing.company_id ?? seller.company_id ?? null,
      ownership_band: parsed.data.ownership_band,
      source,
      status: nextStatus,
      evidence_file_id:
        evidenceId !== undefined ? evidenceId : existing.evidence_file_id,
      evidence_note:
        evidenceNote !== undefined ? evidenceNote : existing.evidence_note,
    })) as EuropeanOwnershipClaimRow

    await appendOwnershipStatusEvent(verification, {
      claim_id: saved.id,
      brand_id,
      manufacturer_id: existing.manufacturer_id ?? null,
      from_status: existing.status,
      to_status: nextStatus,
      note: "Seller heeft Europese eigendom via product bijgewerkt",
      actor_id: actor,
      actor_type: "seller",
      decision: "seller_upsert",
    })
  } else {
    saved = (await verification.createEuropeanOwnershipClaims({
      brand_id,
      manufacturer_id: null,
      seller_id: seller.id,
      company_id: parsed.data.company_id ?? seller.company_id ?? null,
      ownership_band: parsed.data.ownership_band,
      source,
      status: nextStatus,
      evidence_file_id: evidenceId ?? null,
      evidence_note: evidenceNote ?? null,
    })) as EuropeanOwnershipClaimRow

    await appendOwnershipStatusEvent(verification, {
      claim_id: saved.id,
      brand_id,
      to_status: nextStatus,
      note: "Seller heeft Europese eigendom via product aangemaakt",
      actor_id: actor,
      actor_type: "seller",
      decision: "seller_create",
    })
  }

  res.json({ claim: serializeEuropeanOwnershipClaim(saved) })
}
