import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { normalizeProposedFields } from "../../../../modules/product-cloud/change-proposal-fields"

/**
 * GET /admin/product-cloud/change-proposals
 * Default: In behandeling. Enriched with product title for inbox review.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const raw = req.query?.status
  const status = Array.isArray(raw) ? raw[0] : raw
  const filter =
    !status || status === "In behandeling"
      ? { status: "In behandeling" }
      : status === "all"
        ? {}
        : { status: String(status) }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let partner: PartnerModuleService | null = null
  try {
    partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  } catch {
    partner = null
  }

  const rows = await productCloud.listChangeProposals(filter, {
    order: { created_at: "DESC" },
    take: 200,
  })

  const productIds = [...new Set(rows.map((r: { product_id: string }) => r.product_id))]
  const titleByProduct = new Map<string, string | null>()
  for (const productId of productIds) {
    try {
      const versions = (await productCloud.listProductVersions(
        { product_id: productId },
        { order: { version_number: "DESC" }, take: 5 }
      )) as Array<{ title?: string; publication_status?: string }>
      const working =
        versions.find((v) => v.publication_status === "Gepubliceerd") ||
        versions.find((v) => v.publication_status === "In review") ||
        versions[0]
      titleByProduct.set(productId, working?.title?.trim() || null)
    } catch {
      titleByProduct.set(productId, null)
    }
  }

  const sellerNameById = new Map<string, string>()
  async function sellerLabel(sellerId: string): Promise<string> {
    if (sellerNameById.has(sellerId)) return sellerNameById.get(sellerId)!
    if (!partner) {
      sellerNameById.set(sellerId, sellerId)
      return sellerId
    }
    try {
      const seller = await partner.retrieveSeller(sellerId, {
        relations: ["company"],
      })
      const company = seller.company as { legal_name?: string } | undefined
      const label = company?.legal_name?.trim() || sellerId
      sellerNameById.set(sellerId, label)
      return label
    } catch {
      sellerNameById.set(sellerId, sellerId)
      return sellerId
    }
  }

  const change_proposals = []
  for (const row of rows) {
    const fields = normalizeProposedFields(row.proposed_fields)
    change_proposals.push({
      ...row,
      product_title: titleByProduct.get(row.product_id) || null,
      submitter_seller_name: await sellerLabel(row.submitter_seller_id),
      proposed_fields: fields || row.proposed_fields || null,
      field_summary: fields
        ? fields.changes.map((c) => c.label)
        : [
            row.proposed_title ? "Productnaam" : null,
            row.proposed_description ? "Beschrijving" : null,
          ].filter(Boolean),
    })
  }

  res.setHeader("Cache-Control", "no-store")
  res.json({
    change_proposals,
    count: change_proposals.length,
  })
}
