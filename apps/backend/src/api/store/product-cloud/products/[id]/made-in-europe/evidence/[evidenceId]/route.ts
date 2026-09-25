import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../../../../../../../modules/verification"
import type VerificationModuleService from "../../../../../../../../modules/verification/service"
import { resolveApprovedSeller } from "../../../../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../../../../catalog-edit-guard"

type RouteParams = { id: string; evidenceId: string }

/** DELETE — soft-remove evidence (supersede). */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id, evidenceId } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const row = await verification.retrieveProductOriginEvidence(evidenceId)
  if (row.product_id !== id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Bewijs niet gevonden voor dit product."
    )
  }

  await verification.updateProductOriginEvidences({
    id: evidenceId,
    verification_status: "superseded",
  })
  await verification.softDeleteProductOriginEvidences([evidenceId])

  const kind = (row.evidence_kind as string) || "made_in_europe"
  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: row.product_version_id ?? null,
    seller_id: seller.id,
    actor_customer_id: req.auth_context.actor_id,
    field_code:
      kind === "ce_marking"
        ? "compliance.ce_evidence_removed"
        : kind === "data_usage"
          ? "compliance.data_usage_document_removed"
          : "compliance.mie_evidence_removed",
    field_label:
      kind === "ce_marking"
        ? "CE-bewijs verwijderd"
        : kind === "data_usage"
          ? "Datagebruikdocument verwijderd"
          : "Made in Europe bewijs verwijderd",
    old_value: row.file_name || row.storage_reference,
    new_value: null,
    status: "current",
    reason: null,
  })

  await verification.createProductOriginStatusEvents({
    product_id: id,
    product_origin_id: row.product_origin_id ?? null,
    evidence_id: evidenceId,
    from_status: row.verification_status,
    to_status: "superseded",
    note: "Bewijs verwijderd door seller",
    actor_customer_id: req.auth_context.actor_id,
    actor_type: "seller",
  })

  res.json({ ok: true, evidence_id: evidenceId })
}
