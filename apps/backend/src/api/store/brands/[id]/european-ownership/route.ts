import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { VERIFICATION_MODULE } from "../../../../../modules/verification"
import type VerificationModuleService from "../../../../../modules/verification/service"
import {
  EUROPEAN_OWNERSHIP_BANDS,
  EUROPEAN_OWNERSHIP_SOURCES,
  isEuropeanOwnershipBand,
  isEuropeanOwnershipSource,
} from "../../../../../modules/verification/european-ownership"
import { isRealBrandId } from "../../../../../modules/product-cloud/catalog-edit-auth"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { resolveBrandAccess } from "../../brand-access"
import {
  appendOwnershipStatusEvent,
  findClaimByBrand,
  findClaimForProductRefs,
  serializeEuropeanOwnershipClaim,
  statusAfterSellerSubmit,
  type EuropeanOwnershipClaimRow,
} from "../../../product-cloud/european-ownership-helpers"

type RouteParams = { id: string }

const UpsertBody = z.object({
  ownership_band: z.enum(EUROPEAN_OWNERSHIP_BANDS),
  source: z.enum(EUROPEAN_OWNERSHIP_SOURCES),
  evidence_file_id: z.string().trim().min(1).max(500).nullable().optional(),
  evidence_note: z.string().trim().max(2000).nullable().optional(),
  company_id: z.string().trim().min(1).max(100).nullable().optional(),
})

async function loadBrand(
  partner: PartnerModuleService,
  brandId: string
) {
  if (!isRealBrandId(brandId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige merk-referentie voor Europese eigendom."
    )
  }
  try {
    return await partner.retrieveBrand(brandId)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Merk niet gevonden."
    )
  }
}

function sellerMayEditBrandEuropeanOwnership(access: {
  can_edit_description?: boolean
  can_edit_central?: boolean
}): boolean {
  return Boolean(access.can_edit_description || access.can_edit_central)
}

/**
 * GET /store/brands/:id/european-ownership
 * Brand-level European ownership claim (shared by all products of the brand).
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
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService

  const brand = await loadBrand(partner, id)
  const access = await resolveBrandAccess(req.scope, seller, brand as never)
  if (access.level === "none") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot dit merk."
    )
  }

  const claim = await findClaimForProductRefs(verification, {
    brand_id: id,
    manufacturer_id: null,
  })
  const events = claim
    ? await verification.listEuropeanOwnershipStatusEvents(
        { claim_id: claim.id },
        { order: { created_at: "DESC" }, take: 50 }
      )
    : []

  const createdBy =
    (brand as { created_by_seller_id?: string | null }).created_by_seller_id ||
    ""

  res.json({
    brand_id: id,
    brand_name: (brand as { name?: string }).name ?? null,
    claim: claim ? serializeEuropeanOwnershipClaim(claim) : null,
    history: events,
    can_edit:
      sellerMayEditBrandEuropeanOwnership(access) || createdBy === seller.id,
  })
}

/**
 * PUT /store/brands/:id/european-ownership
 * Upsert brand-level claim. Applies to all products of this brand.
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
      "Ongeldige Europese-eigendomgegevens (band/bron)."
    )
  }
  if (
    !isEuropeanOwnershipBand(parsed.data.ownership_band) ||
    !isEuropeanOwnershipSource(parsed.data.source)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige band of bron."
    )
  }

  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService

  const brand = await loadBrand(partner, id)
  const access = await resolveBrandAccess(req.scope, seller, brand as never)
  const createdBy =
    (brand as { created_by_seller_id?: string | null }).created_by_seller_id ||
    ""
  if (
    !sellerMayEditBrandEuropeanOwnership(access) &&
    createdBy !== seller.id
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag Europese eigendom van dit merk niet wijzigen."
    )
  }

  const evidenceId =
    parsed.data.evidence_file_id === undefined
      ? undefined
      : parsed.data.evidence_file_id
  const evidenceNote =
    parsed.data.evidence_note === undefined
      ? undefined
      : parsed.data.evidence_note

  const existing = await findClaimByBrand(verification, id)
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
      brand_id: id,
      manufacturer_id: existing.manufacturer_id ?? null,
      seller_id: seller.id,
      company_id:
        parsed.data.company_id !== undefined
          ? parsed.data.company_id
          : existing.company_id ?? seller.company_id ?? null,
      ownership_band: parsed.data.ownership_band,
      source: parsed.data.source,
      status: nextStatus,
      evidence_file_id:
        evidenceId !== undefined ? evidenceId : existing.evidence_file_id,
      evidence_note:
        evidenceNote !== undefined ? evidenceNote : existing.evidence_note,
    })) as EuropeanOwnershipClaimRow

    await appendOwnershipStatusEvent(verification, {
      claim_id: saved.id,
      brand_id: id,
      manufacturer_id: existing.manufacturer_id ?? null,
      from_status: existing.status,
      to_status: nextStatus,
      note: "Seller heeft Europese-eigendomclaim op merkniveau bijgewerkt",
      actor_id: actor,
      actor_type: "seller",
      decision: "seller_upsert",
    })
  } else {
    saved = (await verification.createEuropeanOwnershipClaims({
      brand_id: id,
      manufacturer_id: null,
      company_id: parsed.data.company_id ?? seller.company_id ?? null,
      seller_id: seller.id,
      ownership_band: parsed.data.ownership_band,
      source: parsed.data.source,
      status: nextStatus,
      evidence_file_id: evidenceId ?? null,
      evidence_note: evidenceNote ?? null,
    })) as EuropeanOwnershipClaimRow

    await appendOwnershipStatusEvent(verification, {
      claim_id: saved.id,
      brand_id: id,
      manufacturer_id: null,
      from_status: "Niet opgegeven",
      to_status: nextStatus,
      note: "Seller heeft Europese-eigendomclaim op merkniveau ingediend",
      actor_id: actor,
      actor_type: "seller",
      decision: "seller_create",
    })
  }

  res.status(existing ? 200 : 201).json({
    claim: serializeEuropeanOwnershipClaim(saved),
    brand_id: id,
  })
}
