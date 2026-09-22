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
import { statusAfterAdminDecision } from "../../../../../modules/verification/european-ownership"
import {
  appendOwnershipStatusEvent,
  serializeEuropeanOwnershipClaim,
  type EuropeanOwnershipClaimRow,
} from "../../../../store/product-cloud/european-ownership-helpers"

type RouteParams = { id: string }

const DecideBody = z.object({
  decision: z.enum(["approve", "request_info", "reject"]),
  note: z.string().trim().max(4000).optional(),
})

async function loadClaim(
  verification: VerificationModuleService,
  id: string
): Promise<EuropeanOwnershipClaimRow> {
  try {
    return (await verification.retrieveEuropeanOwnershipClaim(
      id
    )) as EuropeanOwnershipClaimRow
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Europese-eigendomclaim niet gevonden."
    )
  }
}

/**
 * GET /admin/product-cloud/european-ownership/:id
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const claim = await loadClaim(verification, id)

  let manufacturer: { id: string; name?: string } | null = null
  try {
    manufacturer = (await partner.retrieveManufacturer(
      claim.manufacturer_id
    )) as { id: string; name?: string }
  } catch {
    manufacturer = { id: claim.manufacturer_id }
  }

  const history = await verification.listEuropeanOwnershipStatusEvents(
    { claim_id: claim.id },
    { order: { created_at: "DESC" }, take: 100 }
  )

  res.json({
    claim: serializeEuropeanOwnershipClaim(claim),
    manufacturer,
    history,
  })
}

/**
 * POST /admin/product-cloud/european-ownership/:id/decide
 * body: { decision: approve|request_info|reject, note?: string }
 * Note is optional for approve; recommended/required for request_info and reject.
 * Admin note never auto-changes ownership_band.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const parsed = DecideBody.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "decision moet approve, request_info of reject zijn."
    )
  }

  const note = parsed.data.note?.trim() || ""
  if (
    (parsed.data.decision === "request_info" ||
      parsed.data.decision === "reject") &&
    !note
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Opmerking voor seller is verplicht bij bewijs opvragen of afwijzen."
    )
  }

  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const claim = await loadClaim(verification, id)
  const actor =
    (req.auth_context as { actor_id?: string } | undefined)?.actor_id ?? "admin"
  const nextStatus = statusAfterAdminDecision(parsed.data.decision)
  const reviewNote =
    note ||
    (parsed.data.decision === "approve"
      ? "Goedgekeurd door EuropMade"
      : note)

  const updated = (await verification.updateEuropeanOwnershipClaims({
    id: claim.id,
    status: nextStatus,
    review_note: reviewNote,
    reviewed_by: actor,
    reviewed_at: new Date(),
  })) as EuropeanOwnershipClaimRow

  await appendOwnershipStatusEvent(verification, {
    claim_id: claim.id,
    manufacturer_id: claim.manufacturer_id,
    from_status: claim.status,
    to_status: nextStatus,
    note: reviewNote,
    actor_id: actor,
    actor_type: "admin",
    decision: parsed.data.decision,
  })

  res.json({ claim: serializeEuropeanOwnershipClaim(updated) })
}
