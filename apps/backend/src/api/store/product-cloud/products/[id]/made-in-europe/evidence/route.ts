import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../../../../../../modules/verification"
import type VerificationModuleService from "../../../../../../../modules/verification/service"
import { resolveApprovedSeller } from "../../../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../../../catalog-edit-guard"
import {
  loadMadeInEuropeForProduct,
  loadPublishedVersionId,
  serializeProductionLocation,
} from "../../../../made-in-europe-helpers"
import {
  filePrecheck,
  isEvidenceKind,
  type EvidenceKind,
} from "../../../../../../../modules/product-cloud/compliance-gates"
import { reopenSectionReviewAfterEvidenceUpload } from "../../../../../../../modules/product-cloud/section-review-evidence-sync"
import { summarizeProductEvidence } from "../../../../../../../modules/verification/evidence-review"

type RouteParams = { id: string }

const AddEvidenceBody = z.object({
  storage_reference: z.string().trim().min(1),
  document_type: z.enum(["photo", "pdf", "other"]).default("photo"),
  evidence_kind: z
    .enum(["made_in_europe", "ce_marking", "data_usage"])
    .optional()
    .default("made_in_europe"),
  evidence_kinds: z
    .array(z.enum(["made_in_europe", "ce_marking", "data_usage"]))
    .optional(),
  file_name: z.string().trim().max(255).optional(),
  mime_type: z.string().trim().max(120).optional(),
  file_size_bytes: z.number().int().positive().max(5 * 1024 * 1024).optional(),
})

/**
 * GET — Made in Europe evidence list + verification summary for product owner.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const evidence = await verification.listProductOriginEvidences(
    { product_id: id },
    { order: { created_at: "DESC" } }
  )
  const events = await verification.listProductOriginStatusEvents(
    { product_id: id },
    { order: { created_at: "DESC" } }
  )
  const mie = await loadMadeInEuropeForProduct(req.scope, id)

  const summary = summarizeProductEvidence({
    statuses: (evidence as Array<{ verification_status: string }>).map(
      (row) => row.verification_status
    ),
    score_qualifies: Boolean(mie?.score?.is_made_in_europe),
    origin_status: mie?.origin?.status ?? null,
    score: mie?.score?.score ?? null,
  })
  const evidence_status = summary.evidence_status
  const score_qualifies = summary.is_made_in_europe_score
  const is_verified = summary.is_made_in_europe_verified

  res.json({
    product_id: id,
    origin_status: mie?.origin?.status ?? null,
    score: mie?.score ?? null,
    assembly_eu_band: mie?.origin?.assembly_eu_band ?? null,
    parts_eu_level: mie?.origin?.parts_eu_level ?? null,
    materials_eu_level: mie?.origin?.materials_eu_level ?? null,
    primary_assembly_country: mie?.origin?.primary_assembly_country ?? null,
    production_country: mie?.origin?.production_country ?? null,
    score_can_be_calculated: Boolean(mie?.score),
    facility: serializeProductionLocation(mie?.facility ?? null),
    evidence_status,
    is_made_in_europe_score: score_qualifies,
    is_made_in_europe_verified: is_verified,
    evidence,
    status_events: events,
    note: "Een product telt pas als Made in Europe verified wanneer de score kwalificeert én er goedgekeurd bewijs is.",
  })
}

/**
 * POST — attach production evidence (URL/storage ref). Upload binary via media/upload then pass URL here, or PDF URL.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const parsed = AddEvidenceBody.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bewijs vereist storage_reference en document_type (photo|pdf|other)."
    )
  }
  const body = parsed.data

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const mime = body.mime_type?.toLowerCase() ?? ""
  if (body.document_type === "pdf" && mime && mime !== "application/pdf") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PDF-bewijs moet mime_type application/pdf hebben."
    )
  }
  if (
    body.document_type === "photo" &&
    mime &&
    !["image/jpeg", "image/png", "image/webp"].includes(mime)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Fotobewijs: JPEG, PNG of WebP."
    )
  }

  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const versionId = await loadPublishedVersionId(productCloud, id)
  if (!versionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Geen productversie gevonden."
    )
  }
  const origins = await verification.listProductOrigins({
    product_version_id: versionId,
  })
  const origin = origins[0] as { id: string; status: string } | undefined
  const kind: EvidenceKind = isEvidenceKind(body.evidence_kind)
    ? body.evidence_kind
    : "made_in_europe"
  const kinds: EvidenceKind[] = Array.from(
    new Set(
      (body.evidence_kinds?.length ? body.evidence_kinds : [kind]).filter(
        (value): value is EvidenceKind => isEvidenceKind(value)
      )
    )
  )
  if (kinds.length === 0) kinds.push("made_in_europe")

  const existing = (await verification.listProductOriginEvidences({
    product_id: id,
  })) as Array<{
    evidence_kind?: string | null
    storage_reference?: string | null
    verification_status?: string | null
  }>
  const existingKeys = new Set(
    existing
      .filter((row) => row.verification_status !== "superseded")
      .map(
        (row) =>
          `${row.storage_reference || ""}::${row.evidence_kind || "made_in_europe"}`
      )
  )

  const createdRows = []
  for (const nextKind of kinds) {
    const key = `${body.storage_reference}::${nextKind}`
    if (existingKeys.has(key)) continue
    const precheck = filePrecheck({
      storage_reference: body.storage_reference,
      mime_type: body.mime_type,
      file_size_bytes: body.file_size_bytes,
      kind: nextKind,
    })
    if (precheck.result === "FAIL") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, precheck.notes)
    }

    const createdRaw = await verification.createProductOriginEvidences({
      product_id: id,
      product_origin_id: origin?.id ?? null,
      product_version_id: versionId,
      document_type: body.document_type,
      evidence_kind: nextKind,
      storage_reference: body.storage_reference,
      file_name: body.file_name ?? null,
      mime_type: body.mime_type ?? null,
      file_size_bytes: body.file_size_bytes ?? null,
      verification_status: "pending",
      verification_method: "file_precheck",
      verification_result: precheck.result,
      verification_notes: precheck.notes,
      uploaded_by_customer_id: req.auth_context.actor_id,
    })
    const created = (
      Array.isArray(createdRaw) ? createdRaw[0] : createdRaw
    ) as { id: string }
    createdRows.push({ created, kind: nextKind, precheck })
  }

  const primary = createdRows[0]
  if (!primary) {
    res.status(200).json({
      evidence: existing.find(
        (row) => row.storage_reference === body.storage_reference
      ),
      origin_status: origin?.status ?? null,
      note: "Dit document stond al in het dossier.",
    })
    return
  }

  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: versionId,
    seller_id: seller.id,
    actor_customer_id: req.auth_context.actor_id,
    field_code: "compliance.evidence",
    field_label: "Bewijs toegevoegd",
    old_value: null,
    new_value: body.file_name || body.storage_reference,
    status: "current",
    reason: "pending_review",
  })

  const fromStatus = origin?.status ?? null
  // New evidence always reopens human review (also after aanvulling).
  const toStatus = "In beoordeling"

  if (kinds.includes("made_in_europe") && origin && fromStatus !== toStatus) {
    await verification.updateProductOrigins({
      id: origin.id,
      status: toStatus,
    })
    const { emitCategoryFactsChanged } = await import(
      "../../../../../../../modules/cms/category-cms-proposal-events"
    )
    await emitCategoryFactsChanged(req.scope, { product_id: id })
  }

  const reopened_sections = await reopenSectionReviewAfterEvidenceUpload({
    productCloud,
    productId: id,
    productVersionId: versionId,
    kinds,
    actorCustomerId: req.auth_context.actor_id,
    sellerId: seller.id,
  })

  await verification.createProductOriginStatusEvents({
    product_id: id,
    product_origin_id: origin?.id ?? null,
    evidence_id: primary.created.id,
    from_status: fromStatus,
    to_status: toStatus,
    note: "Bewijs geüpload — wacht op controle",
    actor_customer_id: req.auth_context.actor_id,
    actor_type: "seller",
  })

  res.status(201).json({
    evidence: primary.created,
    evidences: createdRows.map((row) => row.created),
    origin_status: toStatus,
    reopened_sections,
    message:
      "Aanvulling ingediend — wacht op beoordeling",
  })
}
