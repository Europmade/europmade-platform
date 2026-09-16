/**
 * Bridge admin product section reviews ↔ product_origin_evidence.
 * Compliance / publishable gates read evidence.verification_status — not pc_section_review.
 */

import type ProductCloudModuleService from "./service"
import type {
  ProductReviewSectionKey,
  ProductReviewSectionStatus,
} from "./product-review-sections"
import type { EvidenceKind } from "./compliance-gates"

type VerificationModule = {
  listProductOriginEvidences: (
    filter: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<unknown[]>
  updateProductOriginEvidences: (
    data: Record<string, unknown>
  ) => Promise<unknown>
  updateProductOrigins: (data: Record<string, unknown>) => Promise<unknown>
  listProductOrigins: (
    filter: Record<string, unknown>
  ) => Promise<unknown[]>
}

export type EvidenceSyncRow = {
  id: string
  product_id: string
  evidence_kind?: string | null
  verification_status?: string | null
  product_origin_id?: string | null
  product_version_id?: string | null
}

const SECTION_TO_KINDS: Partial<
  Record<ProductReviewSectionKey, EvidenceKind[]>
> = {
  made_in_europe: ["made_in_europe"],
  ce_compliance: ["ce_marking"],
}

export function evidenceKindsForSection(
  sectionKey: ProductReviewSectionKey
): EvidenceKind[] {
  return SECTION_TO_KINDS[sectionKey] || []
}

export function sectionKeyForEvidenceKind(
  kind: string | null | undefined
): ProductReviewSectionKey | null {
  const k = kind || "made_in_europe"
  if (k === "made_in_europe") return "made_in_europe"
  if (k === "ce_marking") return "ce_compliance"
  return null
}

function activeRowsForKinds(
  rows: EvidenceSyncRow[],
  kinds: EvidenceKind[]
): EvidenceSyncRow[] {
  const kindSet = new Set(kinds)
  return rows.filter((r) => {
    if (r.verification_status === "superseded") return false
    const kind = (r.evidence_kind || "made_in_europe") as EvidenceKind
    return kindSet.has(kind)
  })
}

/**
 * Apply section review decision onto live evidence rows (existing verification statuses).
 * - ok → approved
 * - needs_info → needs_info (aanvulling; not a final reject)
 * - rejected → rejected
 * - unreviewed → no-op on evidence
 */
export async function applySectionReviewToEvidence(opts: {
  verification: VerificationModule
  productId: string
  sectionKey: ProductReviewSectionKey
  status: ProductReviewSectionStatus
  comment: string | null
  actor: string
}): Promise<{ updated: number; kinds: EvidenceKind[] }> {
  const kinds = evidenceKindsForSection(opts.sectionKey)
  if (!kinds.length) return { updated: 0, kinds: [] }
  if (opts.status === "unreviewed") return { updated: 0, kinds }

  const all = (await opts.verification.listProductOriginEvidences({
    product_id: opts.productId,
  })) as EvidenceSyncRow[]
  const targets = activeRowsForKinds(all, kinds)
  if (!targets.length) return { updated: 0, kinds }

  const evidenceStatus =
    opts.status === "ok"
      ? "approved"
      : opts.status === "needs_info"
        ? "needs_info"
        : "rejected"

  const notes =
    opts.comment?.trim() ||
    (evidenceStatus === "approved"
      ? "Goedgekeurd door EuropMade"
      : evidenceStatus === "needs_info"
        ? "Aanvulling gevraagd door EuropMade"
        : "Afgekeurd door EuropMade")

  for (const row of targets) {
    await opts.verification.updateProductOriginEvidences({
      id: row.id,
      verification_status: evidenceStatus,
      verification_notes: notes,
      verified_at: new Date(),
      verified_by: opts.actor,
      verification_method: "human_review",
    })
  }

  if (kinds.includes("made_in_europe")) {
    const originId =
      targets.find((t) => t.product_origin_id)?.product_origin_id || null
    if (originId) {
      const originStatus =
        evidenceStatus === "approved"
          ? "Geverifieerd"
          : evidenceStatus === "needs_info"
            ? "Aanvulling gevraagd"
            : "Afgewezen"
      await opts.verification.updateProductOrigins({
        id: originId,
        status: originStatus,
      })
    }
  }

  return { updated: targets.length, kinds }
}

/**
 * After seller uploads new evidence: reopen the matching section review for admin.
 * Keeps the previous comment for context; status → unreviewed.
 */
export async function reopenSectionReviewAfterEvidenceUpload(opts: {
  productCloud: ProductCloudModuleService
  productId: string
  productVersionId: string | null
  kinds: EvidenceKind[]
  actorCustomerId: string
  sellerId: string
}): Promise<ProductReviewSectionKey[]> {
  const sectionKeys = Array.from(
    new Set(
      opts.kinds
        .map((k) => sectionKeyForEvidenceKind(k))
        .filter((k): k is ProductReviewSectionKey => !!k)
    )
  )
  const reopened: ProductReviewSectionKey[] = []

  for (const sectionKey of sectionKeys) {
    const existing = (await opts.productCloud.listProductSectionReviews(
      { product_id: opts.productId, section_key: sectionKey },
      { take: 1 }
    )) as Array<{
      id: string
      status: string
      comment?: string | null
    }>
    const prev = existing[0]
    if (!prev) continue
    if (prev.status === "unreviewed") continue

    await opts.productCloud.updateProductSectionReviews({
      id: prev.id,
      product_version_id: opts.productVersionId,
      status: "unreviewed",
      // Keep last admin comment so seller/admin still see why aanvulling was asked
      comment: prev.comment ?? null,
      decided_by: opts.actorCustomerId,
      decided_at: new Date(),
    })

    await opts.productCloud.createProductFieldChanges({
      product_id: opts.productId,
      product_version_id: opts.productVersionId,
      seller_id: opts.sellerId,
      actor_customer_id: opts.actorCustomerId,
      field_code: `review.section.${sectionKey}`,
      field_label: "Aanvulling opnieuw ingediend",
      old_value: `${prev.status}${prev.comment ? `:${prev.comment}` : ""}`,
      new_value: "unreviewed:resubmitted",
      status: "pending",
      reason: "Seller leverde nieuw bewijs aan — opnieuw ter beoordeling",
    })
    reopened.push(sectionKey)
  }

  // Clear product-level needs_info so seller is not stuck on "Aanvulling gevraagd"
  if (reopened.length && opts.productVersionId) {
    try {
      await opts.productCloud.updateProductVersions({
        id: opts.productVersionId,
        admin_review_outcome: null,
      })
    } catch {
      /* column/update may fail on older rows — non-fatal */
    }
  }

  return reopened
}
