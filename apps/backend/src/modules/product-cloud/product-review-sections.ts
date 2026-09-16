/**
 * Admin product review sections — orthogonal to publication / evidence status.
 * Technical keys stay English; UI maps to Dutch labels.
 */

export const PRODUCT_REVIEW_SECTION_KEYS = [
  "product_info",
  "seller",
  "media",
  "made_in_europe",
  "ce_compliance",
  "content",
  "claims",
  "other",
] as const

export type ProductReviewSectionKey =
  (typeof PRODUCT_REVIEW_SECTION_KEYS)[number]

export const PRODUCT_REVIEW_SECTION_STATUSES = [
  "unreviewed",
  "ok",
  "needs_info",
  "rejected",
] as const

export type ProductReviewSectionStatus =
  (typeof PRODUCT_REVIEW_SECTION_STATUSES)[number]

/** Product-level outcome after eindbeslissing — not publication_status. */
export const PRODUCT_ADMIN_REVIEW_OUTCOMES = [
  "needs_info",
  "rejected",
  "approved",
] as const

export type ProductAdminReviewOutcome =
  (typeof PRODUCT_ADMIN_REVIEW_OUTCOMES)[number]

export const PRODUCT_REVIEW_SECTION_LABELS_NL: Record<
  ProductReviewSectionKey,
  string
> = {
  product_info: "Productinformatie",
  seller: "Seller",
  media: "Media",
  made_in_europe: "Made in Europe",
  ce_compliance: "CE / Compliance",
  content: "Productomschrijving / content",
  claims: "Claims",
  other: "Overige vereisten",
}

export const PRODUCT_REVIEW_STATUS_LABELS_NL: Record<
  ProductReviewSectionStatus,
  string
> = {
  unreviewed: "Nog niet beoordeeld",
  ok: "Goed",
  needs_info: "Aanvullen",
  rejected: "Afwijzen",
}

export function isProductReviewSectionKey(
  value: string
): value is ProductReviewSectionKey {
  return (PRODUCT_REVIEW_SECTION_KEYS as readonly string[]).includes(value)
}

export function isProductReviewSectionStatus(
  value: string
): value is ProductReviewSectionStatus {
  return (PRODUCT_REVIEW_SECTION_STATUSES as readonly string[]).includes(value)
}
