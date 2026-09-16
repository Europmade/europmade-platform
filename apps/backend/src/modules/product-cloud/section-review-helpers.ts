import type ProductCloudModuleService from "./service"
import {
  PRODUCT_REVIEW_SECTION_KEYS,
  PRODUCT_REVIEW_SECTION_LABELS_NL,
  type ProductReviewSectionKey,
  type ProductReviewSectionStatus,
} from "./product-review-sections"

export type SectionReviewRow = {
  id: string | null
  section_key: ProductReviewSectionKey
  label_nl: string
  status: ProductReviewSectionStatus
  comment: string | null
  decided_by: string | null
  decided_at: string | null
  product_version_id: string | null
}

export async function listSectionReviewsForProduct(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<SectionReviewRow[]> {
  const existing = (await productCloud.listProductSectionReviews(
    { product_id: productId },
    { take: 50 }
  )) as Array<{
    id: string
    section_key: ProductReviewSectionKey
    status: ProductReviewSectionStatus
    comment?: string | null
    decided_by?: string | null
    decided_at?: Date | string | null
    product_version_id?: string | null
  }>

  const byKey = new Map(existing.map((r) => [r.section_key, r]))

  return PRODUCT_REVIEW_SECTION_KEYS.map((key) => {
    const row = byKey.get(key)
    return {
      id: row?.id ?? null,
      section_key: key,
      label_nl: PRODUCT_REVIEW_SECTION_LABELS_NL[key],
      status: row?.status ?? "unreviewed",
      comment: row?.comment ?? null,
      decided_by: row?.decided_by ?? null,
      decided_at: row?.decided_at
        ? new Date(row.decided_at).toISOString()
        : null,
      product_version_id: row?.product_version_id ?? null,
    }
  })
}

export function summarizeSectionReviews(rows: SectionReviewRow[]) {
  const needs_info = rows.filter((r) => r.status === "needs_info")
  const rejected = rows.filter((r) => r.status === "rejected")
  const ok = rows.filter((r) => r.status === "ok")
  const unreviewed = rows.filter((r) => r.status === "unreviewed")
  return {
    needs_info_count: needs_info.length,
    rejected_count: rejected.length,
    ok_count: ok.length,
    unreviewed_count: unreviewed.length,
    all_mandatory_ok:
      needs_info.length === 0 &&
      rejected.length === 0 &&
      unreviewed.length === 0,
  }
}
