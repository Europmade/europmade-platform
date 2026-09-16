import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { loadBrandOrThrow } from "../../brand-helpers"
import {
  OWNERSHIP_STATUS,
  appendOwnershipAudit,
  latestClaim,
  listClaimsForBrand,
  listClaimsForSellerBrand,
  sellerMayFileOwnershipClaim,
} from "../../ownership"

type RouteParams = { id: string }

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/**
 * GET /store/brands/:id/ownership-claim
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const brand = await loadBrandOrThrow(req.scope, id)
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  if (!(await sellerMayFileOwnershipClaim(partner, seller, brand))) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen rechten om merkeigenaarschap voor dit merk aan te vragen."
    )
  }
  const claims = await listClaimsForSellerBrand(partner, brand.id, seller.id)
  res.status(200).json({
    claim: latestClaim(claims),
    public_page_status:
      (brand as { public_page_status?: string }).public_page_status ??
      "unpublished",
  })
}

/**
 * POST /store/brands/:id/ownership-claim — submit or resubmit ownership evidence.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  if (!seller.company_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen partnerbedrijf gekoppeld."
    )
  }
  const brand = await loadBrandOrThrow(req.scope, id)
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  if (!(await sellerMayFileOwnershipClaim(partner, seller, brand))) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen rechten om merkeigenaarschap voor dit merk aan te vragen."
    )
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const evidence_note =
    typeof body.evidence_note === "string" ? body.evidence_note.trim() : ""
  const evidence_url =
    typeof body.evidence_url === "string" ? body.evidence_url.trim() : ""
  const file = (req as MedusaRequest & { file?: UploadedFile }).file

  if (!evidence_note && !evidence_url && !file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Lever een toelichting, URL of document aan als bewijs van merkeigenaarschap."
    )
  }

  let evidence_file_id: string | null = null
  if (file) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Ongeldig bestandsformaat. Toegestaan: PDF, JPEG, PNG."
      )
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Bestand is te groot (max. 10 MB)."
      )
    }
    const { result } = await uploadFilesWorkflow(req.scope).run({
      input: {
        files: [
          {
            filename: file.originalname,
            mimeType: file.mimetype,
            content: file.buffer.toString("base64"),
            access: "private",
          },
        ],
      },
    })
    evidence_file_id = result?.[0]?.id ?? null
  }

  const existing = latestClaim(
    await listClaimsForSellerBrand(partner, brand.id, seller.id)
  )
  if (existing?.status === OWNERSHIP_STATUS.GOEDGEKEURD) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Merkeigenaarschap is al goedgekeurd."
    )
  }
  if (
    existing &&
    (existing.status === OWNERSHIP_STATUS.INGEDIEND ||
      existing.status === OWNERSHIP_STATUS.IN_BEOORDELING)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Er loopt al een beoordeling van merkeigenaarschap."
    )
  }

  const approvedOther = (await listClaimsForBrand(partner, brand.id)).find(
    (c) =>
      c.status === OWNERSHIP_STATUS.GOEDGEKEURD && c.seller_id !== seller.id
  )
  if (approvedOther) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Dit merk heeft al een geverifieerde merkeigenaar."
    )
  }

  const payload = {
    brand_id: brand.id,
    seller_id: seller.id,
    company_id: seller.company_id,
    evidence_file_id: evidence_file_id ?? existing?.evidence_file_id ?? null,
    evidence_url: evidence_url || existing?.evidence_url || null,
    evidence_note: evidence_note || existing?.evidence_note || null,
    status: OWNERSHIP_STATUS.INGEDIEND,
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
  }

  let claim
  if (
    existing &&
    (existing.status === OWNERSHIP_STATUS.INFO ||
      existing.status === OWNERSHIP_STATUS.AFGEKEURD)
  ) {
    claim = await partner.updateBrandOwnershipClaims({
      id: existing.id,
      ...payload,
    })
  } else {
    claim = await partner.createBrandOwnershipClaims(payload)
  }

  const saved = Array.isArray(claim) ? claim[0] : claim
  await appendOwnershipAudit(req.scope, {
    actor_id: req.auth_context.actor_id,
    claim_id: saved.id,
    action: "ownership_claim_submitted",
    reason: evidence_note || null,
  })

  res.status(200).json({ claim: saved })
}
