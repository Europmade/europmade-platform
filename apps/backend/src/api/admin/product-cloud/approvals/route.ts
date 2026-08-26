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

/**
 * GET /admin/product-cloud/approvals
 * Products waiting for product approval (publication_status = In review).
 * Distinct from /admin/product-cloud/compliance/evidence.
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

  const versions = (await productCloud.listProductVersions(
    { publication_status: "In review" },
    { order: { updated_at: "DESC" }, take: 200 }
  )) as Array<{
    id: string
    product_id: string
    title: string
    publication_status: string
    approval_requested_at?: Date | string | null
    updated_at?: Date | string
    created_by_seller_id: string
  }>

  const items = []
  const seen = new Set<string>()
  for (const version of versions) {
    if (seen.has(version.product_id)) continue
    seen.add(version.product_id)
    try {
      const product = await productCloud.retrieveProduct(version.product_id)
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
      items.push({
        ...row,
        seller_id: product.current_owner_seller_id,
        seller_name: sellerName,
        version_id: version.id,
        requested_at:
          version.approval_requested_at || version.updated_at || null,
        made_in_europe_status:
          row.completeness?.documents?.find(
            (d: { code: string }) => d.code === "doc.made_in_europe"
          )?.status ||
          (row.completeness?.compliance_review_status === "missing"
            ? "n.v.t."
            : row.completeness?.compliance_review_status) ||
          "—",
      })
    } catch {
      continue
    }
  }

  res.json({ products: items, count: items.length })
}
