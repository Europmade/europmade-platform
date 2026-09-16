import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { adminDecideVersionWorkflow } from "../../../../../../workflows/product-cloud"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { buildSellerProductManagerDetail } from "../../../../../store/product-cloud/product-manager"
import { assertValidGtinForSubmission } from "../../../../../store/product-cloud/submit-gates"
import {
  listSectionReviewsForProduct,
  summarizeSectionReviews,
} from "../../../../../../modules/product-cloud/section-review-helpers"
import { PRODUCT_REVIEW_SECTION_LABELS_NL } from "../../../../../../modules/product-cloud/product-review-sections"

type RouteParams = { id: string }

const Body = z.object({
  decision: z.enum(["approved", "rejected", "request_info"]),
  reason: z.string().trim().max(4000).optional(),
})

/**
 * POST /admin/product-cloud/products/:id/approval
 * Product approval — distinct from compliance evidence approval.
 * Decisions: approved | rejected | request_info
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message ||
        "decision moet approved, rejected of request_info zijn."
    )
  }

  const actor =
    (req.auth_context as { actor_id?: string } | undefined)?.actor_id ?? "admin"
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)

  const section_reviews = await listSectionReviewsForProduct(productCloud, id)
  const summary = summarizeSectionReviews(section_reviews)

  if (parsed.data.decision === "request_info") {
    if (summary.needs_info_count < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Markeer minimaal één beoordelingsonderdeel als Aanvullen voordat je aanvulling vraagt."
      )
    }
    const missingComment = section_reviews.find(
      (s) => s.status === "needs_info" && !s.comment?.trim()
    )
    if (missingComment) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Onderdeel "${PRODUCT_REVIEW_SECTION_LABELS_NL[missingComment.section_key]}" heeft Aanvullen zonder opmerking.`
      )
    }
  }

  if (parsed.data.decision === "rejected") {
    if (summary.rejected_count < 1 && !parsed.data.reason) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Markeer minimaal één onderdeel als Afwijzen of geef een reden."
      )
    }
  }

  if (parsed.data.decision === "approved") {
    if (summary.needs_info_count > 0 || summary.rejected_count > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Niet alle beoordelingsonderdelen zijn akkoord (Aanvullen/Afwijzen aanwezig)."
      )
    }
    let commerce: CommerceCloudModuleService | null = null
    try {
      commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
    } catch {
      commerce = null
    }
    let partner: PartnerModuleService | null = null
    try {
      partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
    } catch {
      partner = null
    }
    const detail = await buildSellerProductManagerDetail(
      productCloud,
      commerce,
      id,
      product.current_owner_seller_id,
      partner,
      req.scope
    )
    if (!detail?.completeness.publishable) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        detail?.completeness.publication_blocked_reasons?.[0] ||
          "Product is niet publiceerbaar — keur eerst verplichte documenten goed en controleer completeness."
      )
    }
    await assertValidGtinForSubmission(productCloud, id)
  }

  const versions = (await productCloud.listProductVersions({
    product_id: id,
  })) as Array<{ id: string; publication_status: string; version_number: number }>

  let target = versions.find((v) => v.publication_status === "In review")
  if (!target && parsed.data.decision === "request_info") {
    target =
      versions.find((v) =>
        ["Concept", "Goedgekeurd"].includes(v.publication_status)
      ) ||
      [...versions].sort((a, b) => b.version_number - a.version_number)[0]
  }
  if (!target) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      parsed.data.decision === "request_info"
        ? "Geen werkende productversie gevonden voor aanvulling."
        : "Geen product in wachtrij voor goedkeuring (status In review)."
    )
  }

  let reason = parsed.data.reason
  if (parsed.data.decision === "request_info") {
    if (!reason?.trim()) {
      reason = section_reviews
        .filter((s) => s.status === "needs_info")
        .map(
          (s) =>
            `${PRODUCT_REVIEW_SECTION_LABELS_NL[s.section_key]}: ${s.comment}`
        )
        .join("\n")
    }
    if (!reason?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Toelichting is verplicht bij aanvulling vragen."
      )
    }
  }
  if (parsed.data.decision === "rejected") {
    if (!reason?.trim()) {
      reason = section_reviews
        .filter((s) => s.status === "rejected")
        .map(
          (s) =>
            `${PRODUCT_REVIEW_SECTION_LABELS_NL[s.section_key]}: ${s.comment || "Afgewezen"}`
        )
        .join("\n")
    }
    if (!reason?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Reden is verplicht bij afwijzen."
      )
    }
  }

  const { result } = await adminDecideVersionWorkflow(req.scope).run({
    input: {
      product_id: id,
      version_id: target.id,
      actor_id: actor,
      decision: parsed.data.decision,
      reason,
    },
  })

  const decided = result as {
    version?: unknown
    lifecycle_status?: string
  }

  res.json({
    decision: parsed.data.decision,
    version: decided.version,
    lifecycle_status: decided.lifecycle_status,
    section_reviews,
  })
}
