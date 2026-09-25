import { adminFetch } from "./admin-fetch"

export class ProductApprovalAdminApiError extends Error {
  status?: number
  payload?: unknown
  constructor(message: string, status?: number, payload?: unknown) {
    super(message)
    this.name = "ProductApprovalAdminApiError"
    this.status = status
    this.payload = payload
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Er is iets misgegaan."
    throw new ProductApprovalAdminApiError(message, response.status, body)
  }
  return body as T
}

export type SectionReviewStatus =
  | "unreviewed"
  | "ok"
  | "needs_info"
  | "rejected"

export type SectionReviewKey =
  | "product_info"
  | "seller"
  | "media"
  | "made_in_europe"
  | "ce_compliance"
  | "content"
  | "claims"
  | "other"

export type SectionReviewRow = {
  id: string | null
  section_key: SectionReviewKey
  label_nl: string
  status: SectionReviewStatus
  comment: string | null
  decided_by: string | null
  decided_at: string | null
  product_version_id: string | null
}

export type ApprovalProductRow = {
  id: string
  title: string | null
  brand_name?: string | null
  category_names?: string[]
  primary_image_url?: string | null
  identifier_value?: string | null
  sku_hint?: string | null
  seller_id?: string | null
  seller_name?: string | null
  completeness?: {
    percent?: number
    publishable?: boolean
    compliance_review_status?: string
    compliance_status?: string
    publication_blocked_reasons?: string[]
    documents?: Array<{
      code?: string
      name?: string
      status?: string
      required?: boolean
    }>
  }
  publication_status?: string | null
  lifecycle_status?: string | null
  workflow_status?: string | null
  admin_review_outcome?: string | null
  offers?: { offer_count?: number; sales_status?: string | null }
  requested_at?: string | null
  made_in_europe_status?: string | null
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
  action_needed?: string[]
  action_needed_label?: string
  queue_status_label?: string
  section_reviews?: SectionReviewRow[]
  media?: Array<{
    id?: string
    media_type?: string
    storage_reference?: string
  }>
  variants?: Array<{ id?: string; title?: string; sku?: string }>
  field_changes?: Array<{
    id?: string
    field_label?: string
    field_code?: string
    new_value?: string
    status?: string
    reason?: string | null
    created_at?: string
  }>
  variant_count?: number
  regular_customer_price?: number | null
}

export type AdminProductListParams = {
  seller_id?: string
  q?: string
  publication_status?: string
  lifecycle_status?: string
  limit?: number
  offset?: number
}

export type AdminProductDetail = {
  product: ApprovalProductRow & Record<string, unknown>
  identity: Record<string, unknown>
  versions: unknown[]
  ownership_records: unknown[]
  claims: Array<Record<string, unknown>>
  change_proposals: Array<Record<string, unknown>>
  evidence: Array<Record<string, unknown>>
  made_in_europe: Record<string, unknown> | null
  seller_id: string | null
  seller_name: string | null
  seller_onboarding_status: string | null
  seller_verification_status: string | null
  seller_made_in_europe_status: string | null
  section_reviews: SectionReviewRow[]
  review_summary: {
    needs_info_count: number
    rejected_count: number
    ok_count: number
    unreviewed_count: number
    all_mandatory_ok: boolean
  }
  approval_actions: {
    approve: boolean
    reject: boolean
    request_info: boolean
    request_info_reason: string
  }
  publishable: boolean
  product_management?: {
    current: {
      kind: "seller" | "brand_owner" | "none"
      seller_id: string | null
      seller_name: string | null
      brand_id: string | null
      brand_name: string | null
      label: string
    }
    candidates: Array<{
      kind: "seller" | "brand_owner" | "none"
      seller_id: string | null
      label: string
    }>
    offer_sellers: Array<{ seller_id: string; label: string }>
    brand_owner: {
      seller_id: string | null
      company_id: string | null
      label: string
    } | null
    history: Array<Record<string, unknown>>
  }
}

/** Backend-supported publication_status values (product_version). */
export const PUBLICATION_STATUS_FILTERS = [
  { key: "", label: "Alle publicatiestatussen" },
  { key: "In review", label: "In beoordeling" },
  { key: "Concept", label: "Concept" },
  { key: "Gepubliceerd", label: "Gepubliceerd" },
  { key: "Goedgekeurd", label: "Goedgekeurd" },
  { key: "Gearchiveerd", label: "Gearchiveerd" },
  { key: "Verwijderd", label: "Verwijderd" },
] as const

/** Backend-supported lifecycle_status values (pc_product). */
export const LIFECYCLE_STATUS_FILTERS = [
  { key: "", label: "Alle lifecycle-statussen" },
  { key: "Retailer Created", label: "Retailer aangemaakt" },
  { key: "Concept gecontroleerd", label: "Concept gecontroleerd" },
  { key: "Actief", label: "Actief" },
  { key: "Verified™", label: "Verified™" },
  { key: "Uitlopend", label: "Uitlopend" },
  { key: "Niet meer leverbaar", label: "Niet meer leverbaar" },
  { key: "Gearchiveerd", label: "Gearchiveerd" },
] as const

export function listProductApprovals() {
  return request<{ products: ApprovalProductRow[]; count: number }>(
    "/admin/product-cloud/approvals"
  )
}

export function listAdminProducts(params: AdminProductListParams | string = {}) {
  const p =
    typeof params === "string" ? { seller_id: params } : params
  const sp = new URLSearchParams()
  if (p.seller_id) sp.set("seller_id", p.seller_id)
  if (p.q) sp.set("q", p.q)
  if (p.publication_status) sp.set("publication_status", p.publication_status)
  if (p.lifecycle_status) sp.set("lifecycle_status", p.lifecycle_status)
  if (p.limit != null) sp.set("limit", String(p.limit))
  if (p.offset != null) sp.set("offset", String(p.offset))
  const qs = sp.toString()
  return request<{
    products: ApprovalProductRow[]
    count: number
    limit?: number
    offset?: number
  }>(`/admin/product-cloud/products${qs ? `?${qs}` : ""}`)
}

export function getAdminProduct(id: string) {
  return request<AdminProductDetail>(`/admin/product-cloud/products/${id}`)
}

export function assignAdminProductManager(
  productId: string,
  body: {
    kind: "seller" | "brand_owner" | "none"
    seller_id?: string | null
    transfer_reason?: string | null
  }
) {
  return request<{
    product_management: NonNullable<AdminProductDetail["product_management"]>
  }>(`/admin/product-cloud/products/${productId}/product-manager`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export type BulkPmCandidate = {
  kind: "seller" | "brand_owner" | "none"
  seller_id: string | null
  label: string
}

export type BulkPmValidationRow = {
  product_id: string
  title: string | null
  current_display: string
  current_type: string
  new_display: string
  new_type: string
  valid: boolean
  error: string | null
}

export type BulkPmPreviewResponse = {
  preview_only: true
  count: number
  shared_candidates: BulkPmCandidate[]
  products: Array<{
    product_id: string
    title: string | null
    current_display: string
    current_type: string
  }>
}

export type BulkPmDryRunResponse = {
  dry_run: true
  all_valid: boolean
  count: number
  invalid_count: number
  new_manager: {
    kind: "seller" | "brand_owner" | "none"
    seller_id: string | null
    label: string
    type: string
  }
  shared_candidates: BulkPmCandidate[]
  products: BulkPmValidationRow[]
  invalid_products: BulkPmValidationRow[]
}

export type BulkPmApplyResponse = {
  all_valid: true
  updated_count: number
  count: number
  invalid_count: number
  new_manager: {
    kind: "seller" | "brand_owner" | "none"
    seller_id: string | null
    label: string
    type: string
  }
  products: BulkPmValidationRow[]
  message?: string
}

export function previewBulkProductManager(product_ids: string[]) {
  return request<BulkPmPreviewResponse>(
    `/admin/product-cloud/products/bulk-product-manager`,
    {
      method: "POST",
      body: JSON.stringify({ product_ids, preview_only: true }),
    }
  )
}

export function dryRunBulkProductManager(body: {
  product_ids: string[]
  kind: "seller" | "brand_owner" | "none"
  seller_id?: string | null
}) {
  return request<BulkPmDryRunResponse>(
    `/admin/product-cloud/products/bulk-product-manager`,
    {
      method: "POST",
      body: JSON.stringify({ ...body, dry_run: true }),
    }
  )
}

export function bulkAssignAdminProductManager(body: {
  product_ids: string[]
  kind: "seller" | "brand_owner" | "none"
  seller_id?: string | null
  transfer_reason?: string | null
}) {
  return request<BulkPmApplyResponse>(
    `/admin/product-cloud/products/bulk-product-manager`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

export type BulkGenericRow = {
  product_id: string
  title: string | null
  current_display: string
  new_display?: string
  valid?: boolean
  error?: string | null
}

export function previewBulkBrand(product_ids: string[]) {
  return request<{
    preview_only: true
    count: number
    products: BulkGenericRow[]
    available_brands: Array<{ id: string; name: string }>
  }>(`/admin/product-cloud/products/bulk-brand`, {
    method: "POST",
    body: JSON.stringify({ product_ids, preview_only: true }),
  })
}

export function dryRunBulkBrand(body: {
  product_ids: string[]
  brand_id: string
}) {
  return request<{
    dry_run: true
    all_valid: boolean
    count: number
    invalid_count: number
    products: BulkGenericRow[]
    invalid_products: BulkGenericRow[]
    new_value: { brand_id: string; label: string }
  }>(`/admin/product-cloud/products/bulk-brand`, {
    method: "POST",
    body: JSON.stringify({ ...body, dry_run: true }),
  })
}

export function applyBulkBrand(body: {
  product_ids: string[]
  brand_id: string
  transfer_reason?: string
}) {
  return request<{
    updated_count: number
    count: number
    message?: string
  }>(`/admin/product-cloud/products/bulk-brand`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function previewBulkInformation(product_ids: string[]) {
  return request<{
    preview_only: true
    count: number
    products: BulkGenericRow[]
    allowed_codes: Array<{ code: string; label: string }>
  }>(`/admin/product-cloud/products/bulk-information`, {
    method: "POST",
    body: JSON.stringify({ product_ids, preview_only: true }),
  })
}

export function dryRunBulkInformation(body: {
  product_ids: string[]
  attributes: Array<{ code: string; value: string }>
}) {
  return request<{
    dry_run: true
    all_valid: boolean
    count: number
    invalid_count: number
    products: BulkGenericRow[]
    invalid_products: BulkGenericRow[]
  }>(`/admin/product-cloud/products/bulk-information`, {
    method: "POST",
    body: JSON.stringify({ ...body, dry_run: true }),
  })
}

export function applyBulkInformation(body: {
  product_ids: string[]
  attributes: Array<{ code: string; value: string }>
  reason?: string
}) {
  return request<{
    updated_count: number
    count: number
    message?: string
  }>(`/admin/product-cloud/products/bulk-information`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function getAdminProductManager(productId: string) {
  return request<{
    product_management: NonNullable<AdminProductDetail["product_management"]>
  }>(`/admin/product-cloud/products/${productId}/product-manager`, {
    cache: "no-store",
  })
}

export function saveSectionReview(
  productId: string,
  body: {
    section_key: SectionReviewKey
    status: SectionReviewStatus
    comment?: string | null
  }
) {
  return request<{
    section_review: SectionReviewRow
    section_reviews: SectionReviewRow[]
  }>(`/admin/product-cloud/products/${productId}/section-reviews`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function decideProductApproval(
  productId: string,
  body: {
    decision: "approved" | "rejected" | "request_info"
    reason?: string
  }
) {
  return request<{
    decision: string
    version: unknown
    lifecycle_status?: string
    section_reviews?: SectionReviewRow[]
  }>(`/admin/product-cloud/products/${productId}/approval`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}
