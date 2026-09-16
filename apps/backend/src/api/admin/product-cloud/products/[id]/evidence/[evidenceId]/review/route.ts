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

type RouteParams = { id: string; evidenceId: string }

const Body = z.object({
  status: z.enum(["approved", "rejected"]),
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
      "status moet approved of rejected zijn."
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
    (req.auth_context as { actor_id?: string } | undefined)?.actor_id ?? "admin"
  if (
    row.uploaded_by_customer_id &&
    actor &&
    row.uploaded_by_customer_id === actor
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Een seller mag eigen bewijs niet goedkeuren."
    )
  }
  const updated = await verification.updateProductOriginEvidences({
    id: evidenceId,
    verification_status: parsed.data.status,
    verification_notes:
      parsed.data.reason ??
      (parsed.data.status === "approved"
        ? "Goedgekeurd door EuropMade"
        : "Afgekeurd door EuropMade"),
    verified_at: new Date(),
    verified_by: actor,
    verification_method: "human_review",
  })

  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: row.product_version_id ?? null,
    seller_id: "admin",
    actor_customer_id: actor,
    field_code:
      parsed.data.status === "approved"
        ? "compliance.approved"
        : "compliance.rejected",
    field_label:
      parsed.data.status === "approved"
        ? "Compliance goedgekeurd"
        : "Compliance afgekeurd",
    old_value: row.verification_status,
    new_value: parsed.data.reason || parsed.data.status,
    status: parsed.data.status === "approved" ? "approved" : "rejected",
    reason: parsed.data.reason ?? null,
  })

  if (row.product_origin_id && (row.evidence_kind || "made_in_europe") === "made_in_europe") {
    await verification.updateProductOrigins({
      id: row.product_origin_id,
      status:
        parsed.data.status === "approved" ? "Geverifieerd" : "Afgewezen",
    })
  }

  res.json({ evidence: updated })
}
