import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { VERIFICATION_MODULE } from "../../../../../modules/verification"
import type VerificationModuleService from "../../../../../modules/verification/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"

/**
 * GET /admin/product-cloud/compliance/evidence
 * List compliance evidence for admin review.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService

  const status = String(req.query.status || "pending").toLowerCase()
  const sellerFilter =
    typeof req.query.seller_id === "string"
      ? req.query.seller_id.trim()
      : ""
  const take = Math.min(200, Math.max(1, Number(req.query.limit) || 50))

  const rows = await verification.listProductOriginEvidences(
    {},
    { order: { created_at: "DESC" }, take: 500 }
  )

  const filtered = (rows as Array<Record<string, unknown>>).filter((row) => {
    const vs = String(row.verification_status || "")
    if (vs === "superseded") return false
    if (status === "pending") return vs === "pending" || vs === "pending_review"
    if (status === "approved") return vs === "approved"
    if (status === "rejected") return vs === "rejected"
    return true
  })

  const items = []
  for (const row of filtered.slice(0, take)) {
    const productId = String(row.product_id || "")
    let title: string | null = null
    let ean: string | null = null
    let sellerId: string | null = null
    let sellerName: string | null = null
    try {
      const product = await productCloud.retrieveProduct(productId)
      sellerId = product.current_owner_seller_id ?? null
      const versions = await productCloud.listProductVersions({ product_id: productId })
      const working =
        versions.find((v: { publication_status: string }) =>
          ["Concept", "In review", "Goedgekeurd"].includes(v.publication_status)
        ) || versions[0]
      title = working?.title ?? product.id
      const variants = await productCloud.listProductVariants({
        product_id: productId,
      })
      if (variants[0]) {
        const ids = await productCloud.listIdentifiers({
          product_variant_id: variants[0].id,
        })
        const gtin = ids.find((i: { identifier_type: string }) => i.identifier_type === "GTIN")
        ean = gtin?.identifier_value ?? ids[0]?.identifier_value ?? null
      }
      if (sellerId) {
        try {
          const seller = await partner.retrieveSeller(sellerId, {
            relations: ["company"],
          })
          const company = seller.company as { legal_name?: string } | undefined
          sellerName = company?.legal_name?.trim() || sellerId
        } catch {
          sellerName = sellerId
        }
      }
    } catch {
      title = productId
    }
    if (sellerFilter && sellerId !== sellerFilter) continue
    items.push({
      id: row.id,
      product_id: productId,
      product_title: title,
      ean,
      seller_id: sellerId,
      seller_name: sellerName,
      uploaded_by_customer_id: row.uploaded_by_customer_id ?? null,
      evidence_kind: row.evidence_kind || "made_in_europe",
      document_type: row.document_type,
      storage_reference: row.storage_reference,
      file_name: row.file_name,
      mime_type: row.mime_type,
      verification_status: row.verification_status,
      verification_result: row.verification_result,
      verification_notes: row.verification_notes,
      created_at: row.created_at,
    })
  }

  res.json({ evidence: items, count: items.length })
}
