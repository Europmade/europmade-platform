import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import {
  buildSellerProductManagerRow,
  loadSellerOfferLookup,
} from "../../../store/product-cloud/product-manager"
import { VERIFICATION_MODULE } from "../../../../modules/verification"
import type VerificationModuleService from "../../../../modules/verification/service"
import { listSectionReviewsForProduct } from "../../../../modules/product-cloud/section-review-helpers"

/**
 * GET /admin/product-cloud/approvals
 * Admin action queue: products needing review attention.
 * Includes In review + pending evidence + needs_information outcomes.
 * Detail review always happens on /product-cloud/products/:id.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  let verification: VerificationModuleService | null = null
  try {
    verification = req.scope.resolve(VERIFICATION_MODULE) as VerificationModuleService
  } catch {
    verification = null
  }

  const productIds = new Set<string>()
  const actionHints = new Map<string, string[]>()

  function addHint(productId: string, hint: string) {
    const list = actionHints.get(productId) || []
    if (!list.includes(hint)) list.push(hint)
    actionHints.set(productId, list)
    productIds.add(productId)
  }

  const inReviewVersions = (await productCloud.listProductVersions(
    { publication_status: "In review" },
    { order: { updated_at: "DESC" }, take: 200 }
  )) as Array<{ product_id: string }>
  for (const v of inReviewVersions) {
    addHint(v.product_id, "Productgoedkeuring (In beoordeling)")
  }

  const needsInfoVersions = (await productCloud.listProductVersions(
    { admin_review_outcome: "needs_info" },
    { order: { updated_at: "DESC" }, take: 200 }
  )) as Array<{ product_id: string; publication_status: string }>
  for (const v of needsInfoVersions) {
    if (v.publication_status === "Gepubliceerd") continue
    addHint(v.product_id, "Wacht op seller-aanvulling")
  }

  if (verification) {
    const allEvidence = (await verification.listProductOriginEvidences(
      {},
      { take: 500, order: { created_at: "DESC" } }
    )) as Array<{
      product_id: string
      evidence_kind?: string
      verification_status?: string
    }>
    for (const ev of allEvidence) {
      const vs = String(ev.verification_status || "")
      if (vs !== "pending" && vs !== "pending_review") continue
      const kind =
        ev.evidence_kind === "ce_marking"
          ? "CE controleren"
          : ev.evidence_kind === "made_in_europe"
            ? "Made in Europe controleren"
            : "Compliance-bewijs controleren"
      addHint(ev.product_id, kind)
    }
  }

  const items: Array<Record<string, unknown>> = []
  for (const productId of productIds) {
    try {
      const product = await productCloud.retrieveProduct(productId)
      const offerMaps = await loadSellerOfferLookup(
        commerce,
        product.current_owner_seller_id
      )
      const row = await buildSellerProductManagerRow(
        productCloud,
        commerce,
        product,
        product.current_owner_seller_id,
        {
          offerMaps,
          partner,
          verification,
          container: req.scope,
        }
      )
      let sellerName: string | null = product.current_owner_seller_id
      try {
        const seller = await partner.retrieveSeller(
          product.current_owner_seller_id,
          { relations: ["company"] }
        )
        const company = seller.company as { legal_name?: string } | undefined
        sellerName = company?.legal_name?.trim() || sellerName
      } catch {
        /* keep id */
      }

      const section_reviews = await listSectionReviewsForProduct(
        productCloud,
        productId
      )
      const needs = section_reviews.filter((s) => s.status === "needs_info")
      const action_needed = [
        ...(actionHints.get(productId) || []),
        ...needs.map((s) => `${s.label_nl} aanvullen`),
      ]
      const uniqueActions = [...new Set(action_needed)]
      const rowAny = row as Record<string, unknown>

      items.push({
        ...rowAny,
        seller_id: product.current_owner_seller_id,
        seller_name: sellerName,
        version_id: rowAny.version_id ?? null,
        requested_at:
          rowAny.approval_requested_at || rowAny.updated_at || null,
        action_needed: uniqueActions,
        action_needed_label: uniqueActions.join(" · ") || "Review",
        queue_status_label:
          rowAny.admin_review_outcome === "needs_info"
            ? "Aanvulling nodig"
            : rowAny.publication_status === "In review"
              ? "In beoordeling"
              : rowAny.workflow_status === "pending_evidence_review"
                ? "Bewijs te beoordelen"
                : "Actie vereist",
        made_in_europe_status:
          (
            row.completeness?.documents?.find(
              (d: { code: string }) => d.code === "doc.made_in_europe"
            ) as { status?: string } | undefined
          )?.status ||
          (row.completeness?.compliance_review_status === "missing"
            ? "n.v.t."
            : row.completeness?.compliance_review_status) ||
          "—",
        section_reviews,
      })
    } catch (err) {
      console.warn(
        `[admin/product-cloud/approvals] skip product ${productId}:`,
        err instanceof Error ? err.message : err
      )
      continue
    }
  }

  items.sort((a, b) => {
    const ta = a.requested_at ? new Date(String(a.requested_at)).getTime() : 0
    const tb = b.requested_at ? new Date(String(b.requested_at)).getTime() : 0
    return tb - ta
  })

  res.json({ products: items, count: items.length })
}
