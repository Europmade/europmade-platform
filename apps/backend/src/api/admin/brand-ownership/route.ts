import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"

/**
 * GET /admin/brand-ownership — review queue for merkeigenaarschap.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined
  const filter = status ? { status } : {}
  const claims = (await partner.listBrandOwnershipClaims(filter, {
    take: 200,
    order: { created_at: "DESC" },
  })) as Array<{
    id: string
    brand_id: string
    seller_id: string
    company_id: string
    evidence_file_id?: string | null
    evidence_url?: string | null
    evidence_note?: string | null
    status: string
    review_note?: string | null
    reviewed_by?: string | null
    reviewed_at?: Date | string | null
    created_at?: Date | string
  }>

  const items = []
  for (const claim of claims) {
    let brand_name = claim.brand_id
    let brand_slug: string | null = null
    try {
      const brand = await partner.retrieveBrand(claim.brand_id)
      brand_name = (brand as { name?: string }).name ?? claim.brand_id
      brand_slug = (brand as { slug?: string | null }).slug ?? null
    } catch {
      /* keep id */
    }
    let seller_name: string | null = null
    try {
      const seller = await partner.retrieveSeller(claim.seller_id, {
        relations: ["company"],
      })
      seller_name =
        (seller as { company?: { legal_name?: string } | null }).company
          ?.legal_name ?? null
    } catch {
      seller_name = null
    }
    items.push({
      ...claim,
      brand_name,
      brand_slug,
      seller_name,
    })
  }

  const pendingPages = (await partner
    .listBrands({ page_review_status: "in_review" }, { take: 100 })
    .catch(() => [])) as Array<{
    id: string
    name?: string
    slug?: string | null
    page_review_status?: string
    page_submitted_by_seller_id?: string | null
    page_review_note?: string | null
  }>
  const infoPages = (await partner
    .listBrands({ page_review_status: "info_requested" }, { take: 100 })
    .catch(() => [])) as typeof pendingPages
  const pages = []
  for (const row of [...pendingPages, ...infoPages]) {
    let seller_name: string | null = null
    if (row.page_submitted_by_seller_id) {
      try {
        const seller = await partner.retrieveSeller(row.page_submitted_by_seller_id, {
          relations: ["company"],
        })
        seller_name =
          (seller as { company?: { legal_name?: string } | null }).company
            ?.legal_name ?? null
      } catch {
        seller_name = null
      }
    }
    pages.push({
      brand_id: row.id,
      brand_name: row.name ?? row.id,
      brand_slug: row.slug ?? null,
      page_review_status: row.page_review_status ?? "in_review",
      submitted_by: row.page_submitted_by_seller_id ?? null,
      seller_name,
      review_note: row.page_review_note ?? null,
    })
  }

  res.status(200).json({ claims: items, count: items.length, pages, page_count: pages.length })
}
