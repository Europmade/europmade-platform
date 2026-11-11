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
  PRODUCT_REVIEW_SECTION_KEYS,
  PRODUCT_REVIEW_SECTION_LABELS_NL,
  PRODUCT_REVIEW_SECTION_STATUSES,
  PRODUCT_REVIEW_STATUS_LABELS_NL,
} from "../../../../../../modules/product-cloud/product-review-sections"
import { listSectionReviewsForProduct } from "../../../../../../modules/product-cloud/section-review-helpers"
import { applySectionReviewToEvidence } from "../../../../../../modules/product-cloud/section-review-evidence-sync"

type RouteParams = { id: string }

const Body = z.object({
  section_key: z.enum(PRODUCT_REVIEW_SECTION_KEYS),
  status: z.enum(PRODUCT_REVIEW_SECTION_STATUSES),
  comment: z.string().trim().max(4000).optional().nullable(),
})

/**
 * GET /admin/product-cloud/products/:id/section-reviews
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  await productCloud.retrieveProduct(id)
  const section_reviews = await listSectionReviewsForProduct(productCloud, id)
  res.json({ product_id: id, section_reviews })
}

/**
 * PUT /admin/product-cloud/products/:id/section-reviews
 * Upsert één beoordelingsonderdeel + audit via pc_field_change.
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message || "Ongeldige beoordeling."
    )
  }

  const { section_key, status } = parsed.data
  const comment = (parsed.data.comment || "").trim() || null

  if (
    (status === "needs_info" || status === "rejected") &&
    !comment
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bij Aanvullen of Afwijzen is een opmerking verplicht."
    )
  }

  const actor =
    (req.auth_context as { actor_id?: string } | undefined)?.actor_id ?? "admin"
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  await productCloud.retrieveProduct(id)

  const versions = (await productCloud.listProductVersions(
    { product_id: id },
    { order: { version_number: "DESC" }, take: 20 }
  )) as Array<{ id: string; publication_status: string }>
  const working =
    versions.find((v) =>
      ["Concept", "In review", "Goedgekeurd"].includes(v.publication_status)
    ) || versions[0]

  const existing = (await productCloud.listProductSectionReviews(
    { product_id: id, section_key },
    { take: 1 }
  )) as Array<{ id: string; status: string; comment?: string | null }>

  const prev = existing[0]
  const decidedAt = new Date()
  let row: { id: string }

  if (prev) {
    const updated = await productCloud.updateProductSectionReviews({
      id: prev.id,
      product_version_id: working?.id ?? null,
      status,
      comment,
      decided_by: actor,
      decided_at: decidedAt,
    })
    row = (Array.isArray(updated) ? updated[0] : updated) as { id: string }
  } else {
    const created = await productCloud.createProductSectionReviews({
      product_id: id,
      product_version_id: working?.id ?? null,
      section_key,
      status,
      comment,
      decided_by: actor,
      decided_at: decidedAt,
    })
    row = (Array.isArray(created) ? created[0] : created) as { id: string }
  }

  const label = PRODUCT_REVIEW_SECTION_LABELS_NL[section_key]
  const statusLabel = PRODUCT_REVIEW_STATUS_LABELS_NL[status]
  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: working?.id ?? null,
    seller_id: "admin",
    actor_customer_id: actor,
    field_code: `review.section.${section_key}`,
    field_label: `Productbeoordeling · ${label}`,
    old_value: prev
      ? `${prev.status}${prev.comment ? `:${prev.comment}` : ""}`
      : "unreviewed",
    new_value: `${status}${comment ? `:${comment}` : ""}`,
    status:
      status === "ok"
        ? "approved"
        : status === "rejected"
          ? "rejected"
          : status === "needs_info"
            ? "pending"
            : "current",
    reason: comment || statusLabel,
  })

  // Compliance sections must update underlying evidence — gates read evidence, not section reviews.
  let evidence_sync: { updated: number; kinds: string[] } | null = null
  if (
    (section_key === "made_in_europe" || section_key === "ce_compliance") &&
    (status === "ok" || status === "needs_info" || status === "rejected")
  ) {
    try {
      const verification = req.scope.resolve(
        VERIFICATION_MODULE
      ) as VerificationModuleService
      evidence_sync = await applySectionReviewToEvidence({
        verification,
        productId: id,
        sectionKey: section_key,
        status,
        comment,
        actor,
      })
      await productCloud.createProductFieldChanges({
        product_id: id,
        product_version_id: working?.id ?? null,
        seller_id: "admin",
        actor_customer_id: actor,
        field_code:
          status === "ok"
            ? "compliance.approved"
            : status === "needs_info"
              ? "compliance.needs_info"
              : "compliance.rejected",
        field_label:
          status === "ok"
            ? `${label} — evidence goedgekeurd`
            : status === "needs_info"
              ? `${label} — aanvulling gevraagd`
              : `${label} — evidence afgewezen`,
        old_value: null,
        new_value: comment || status,
        status:
          status === "ok"
            ? "approved"
            : status === "rejected"
              ? "rejected"
              : "pending",
        reason: comment || statusLabel,
      })
    } catch {
      evidence_sync = { updated: 0, kinds: [] }
    }
  }

  if (section_key === "made_in_europe") {
    const { emitCategoryFactsChanged } = await import(
      "../../../../../../modules/cms/category-cms-proposal-events"
    )
    await emitCategoryFactsChanged(req.scope, { product_id: id })
  }

  const section_reviews = await listSectionReviewsForProduct(productCloud, id)
  res.json({
    section_review: section_reviews.find((s) => s.section_key === section_key),
    section_reviews,
    id: row.id,
    evidence_sync,
  })
}
