import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import {
  OWNERSHIP_STATUS,
  approvedOwnerClaim,
  appendOwnershipAudit,
  assertReviewNote,
} from "../../../store/brands/ownership"

type RouteParams = { id: string }

async function loadClaim(
  partner: PartnerModuleService,
  id: string
) {
  try {
    return await partner.retrieveBrandOwnershipClaim(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Aanvraag merkeigenaarschap niet gevonden."
    )
  }
}

/**
 * GET /admin/brand-ownership/:id
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const claim = await loadClaim(partner, id)
  let brand = null
  try {
    brand = await partner.retrieveBrand(claim.brand_id, {
      relations: ["owner_company"],
    })
  } catch {
    brand = { id: claim.brand_id }
  }
  let seller = null
  try {
    seller = await partner.retrieveSeller(claim.seller_id, {
      relations: ["company"],
    })
  } catch {
    seller = { id: claim.seller_id }
  }
  const existingOwner = await approvedOwnerClaim(partner, claim.brand_id)
  res.status(200).json({
    claim,
    brand,
    seller,
    existing_owner: existingOwner,
  })
}

/**
 * POST /admin/brand-ownership/:id — decide claim.
 * body: { action: approve|reject|request_info, note?: string }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const claim = await loadClaim(partner, id)
  const body = (req.body ?? {}) as { action?: string; note?: string }
  const actor = req.auth_context.actor_id ?? "admin"
  const now = new Date()

  if (body.action === "approve") {
    const updated = await partner.updateBrandOwnershipClaims({
      id: claim.id,
      status: OWNERSHIP_STATUS.GOEDGEKEURD,
      review_note: body.note?.trim() || "Goedgekeurd",
      reviewed_by: actor,
      reviewed_at: now,
    })
    try {
      await partner.updateBrands({
        id: claim.brand_id,
        owner_company_id: claim.company_id,
      })
    } catch {
      /* ownership is recorded on the claim; brand owner link is best-effort */
    }
    await appendOwnershipAudit(req.scope, {
      actor_id: actor,
      claim_id: claim.id,
      action: "ownership_claim_approved",
      reason: body.note?.trim() || "Goedgekeurd",
    })
    res.status(200).json({ claim: updated })
    return
  }

  if (body.action === "reject") {
    const note = assertReviewNote(body.note, "Afwijzingsreden")
    const updated = await partner.updateBrandOwnershipClaims({
      id: claim.id,
      status: OWNERSHIP_STATUS.AFGEKEURD,
      review_note: note,
      reviewed_by: actor,
      reviewed_at: now,
    })
    try {
      await partner.updateBrands({
        id: claim.brand_id,
        public_page_status: "unpublished",
      })
    } catch {
      /* brand stays; page stays unpublished */
    }
    await appendOwnershipAudit(req.scope, {
      actor_id: actor,
      claim_id: claim.id,
      action: "ownership_claim_rejected",
      reason: note,
    })
    res.status(200).json({ claim: updated })
    return
  }

  if (body.action === "request_info") {
    const note = assertReviewNote(body.note, "Verzoek om aanvullende informatie")
    const updated = await partner.updateBrandOwnershipClaims({
      id: claim.id,
      status: OWNERSHIP_STATUS.INFO,
      review_note: note,
      reviewed_by: actor,
      reviewed_at: now,
    })
    await appendOwnershipAudit(req.scope, {
      actor_id: actor,
      claim_id: claim.id,
      action: "ownership_claim_info_requested",
      reason: note,
    })
    res.status(200).json({ claim: updated })
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "action moet approve, reject of request_info zijn."
  )
}
