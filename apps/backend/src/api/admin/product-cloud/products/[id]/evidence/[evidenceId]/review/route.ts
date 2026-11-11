import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../../../../../../../modules/verification"
import type VerificationModuleService from "../../../../../../../../modules/verification/service"
import {
  EvidenceReviewRejected,
  planEvidenceReview,
} from "../../../../../../../../modules/verification/evidence-review"

type RouteParams = { id: string; evidenceId: string }

const Body = z.object({
  status: z.enum(["approved", "rejected", "needs_info"]),
  reason: z.string().trim().max(2000).optional(),
})

/**
 * POST /admin/product-cloud/products/:id/evidence/:evidenceId/review
 * Human compliance decision. Never auto-approved from upload.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id, evidenceId } = req.params as RouteParams
  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "status moet approved, rejected of needs_info zijn."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService

  await productCloud.retrieveProduct(id)
  const row = await verification.retrieveProductOriginEvidence(evidenceId)
  if (row.product_id !== id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bewijs hoort niet bij dit product."
    )
  }

  const actor =
    (req.auth_context as { actor_id?: string } | undefined)?.actor_id || ""
  let plan
  try {
    plan = planEvidenceReview({
      status: parsed.data.status,
      reason: parsed.data.reason,
      actor_id: actor,
      uploaded_by_customer_id: row.uploaded_by_customer_id,
    })
  } catch (err) {
    if (err instanceof EvidenceReviewRejected) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, err.message)
    }
    throw err
  }

  const updated = await verification.updateProductOriginEvidences({
    id: evidenceId,
    verification_status: plan.verification_status,
    verification_notes: plan.verification_notes,
    verified_at: new Date(),
    verified_by: plan.verified_by,
    verification_method: plan.verification_method,
  })

  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: row.product_version_id ?? null,
    seller_id: "admin",
    actor_customer_id: actor,
    field_code: plan.field_code,
    field_label: plan.field_label,
    old_value: row.verification_status,
    new_value: plan.new_value,
    status: plan.field_status,
    reason: parsed.data.reason ?? null,
  })

  res.json({ evidence: updated })
}
