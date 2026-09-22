import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
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
  appendOwnershipStatusEvent,
  findClaimByManufacturer,
  serializeEuropeanOwnershipClaim,
  statusAfterSellerSubmit,
  type EuropeanOwnershipClaimRow,
} from "../../../european-ownership-helpers"

type RouteParams = { id: string }

const UpsertBody = z.object({
  ownership_band: z.enum(EUROPEAN_OWNERSHIP_BANDS),
  source: z.enum(EUROPEAN_OWNERSHIP_SOURCES),
  evidence_file_id: z.string().trim().min(1).max(500).nullable().optional(),
  evidence_note: z.string().trim().max(2000).nullable().optional(),
  company_id: z.string().trim().min(1).max(100).nullable().optional(),
})

async function resolveProductManufacturerId(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<{ manufacturer_id: string; owner_seller_id: string }> {
  const product = (await productCloud.retrieveProduct(productId)) as {
    id: string
    manufacturer_id?: string | null
    current_owner_seller_id?: string
  }
  const manufacturerId = (product.manufacturer_id || "").trim()
  if (!manufacturerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Dit product heeft geen fabrikant-referentie; Europese eigendom kan niet worden gekoppeld."
    )
  }
  return {
    manufacturer_id: manufacturerId,
    owner_seller_id: product.current_owner_seller_id || "",
  }
}

/**
 * GET /store/product-cloud/products/:id/european-ownership
 * Claim for the product's manufacturer (seller view, includes review_note).
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

  const { manufacturer_id, owner_seller_id } =
    await resolveProductManufacturerId(productCloud, id)
  if (owner_seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de producteigenaar kan deze claim inzien."
    )
  }

  const claim = await findClaimByManufacturer(verification, manufacturer_id)
  const events = claim
    ? await verification.listEuropeanOwnershipStatusEvents(
        { claim_id: claim.id },
        { order: { created_at: "DESC" }, take: 50 }
      )
    : []

  res.json({
    manufacturer_id,
    claim: claim ? serializeEuropeanOwnershipClaim(claim) : null,
    history: events,
  })
}

/**
 * PUT /store/product-cloud/products/:id/european-ownership
 * Upsert manufacturer-level claim. Evidence optional.
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

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService

  const { manufacturer_id, owner_seller_id } =
    await resolveProductManufacturerId(productCloud, id)
  if (owner_seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de producteigenaar kan deze claim indienen."
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

  const existing = await findClaimByManufacturer(verification, manufacturer_id)
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
      // Seller resubmit clears admin decision timestamps but keeps last review_note visible until next admin action overwrites
    })) as EuropeanOwnershipClaimRow

    await appendOwnershipStatusEvent(verification, {
      claim_id: saved.id,
      manufacturer_id,
      from_status: existing.status,
      to_status: nextStatus,
      note: "Seller heeft Europese-eigendomclaim bijgewerkt",
      actor_id: actor,
      actor_type: "seller",
      decision: "seller_upsert",
    })
  } else {
    saved = (await verification.createEuropeanOwnershipClaims({
      manufacturer_id,
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
      manufacturer_id,
      from_status: "Niet opgegeven",
      to_status: nextStatus,
      note: "Seller heeft Europese-eigendomclaim ingediend",
      actor_id: actor,
      actor_type: "seller",
      decision: "seller_create",
    })
  }

  res.status(existing ? 200 : 201).json({
    claim: serializeEuropeanOwnershipClaim(saved),
  })
}
