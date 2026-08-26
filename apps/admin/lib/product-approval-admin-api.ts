const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export class ProductApprovalAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ProductApprovalAdminApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Er is iets misgegaan."
    throw new ProductApprovalAdminApiError(message, response.status)
  }
  return body as T
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
  offers?: { offer_count?: number; sales_status?: string | null }
  requested_at?: string | null
  made_in_europe_status?: string | null
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
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
  approval_actions: {
    approve: boolean
    reject: boolean
    request_info: boolean
    request_info_reason: string
  }
  publishable: boolean
}

/** Backend-supported publication_status values (product_version). */
export const PUBLICATION_STATUS_FILTERS = [
  { key: "", label: "Alle publicatiestatussen" },
  { key: "In review", label: "In review" },
  { key: "Concept", label: "Concept" },
  { key: "Gepubliceerd", label: "Gepubliceerd" },
  { key: "Goedgekeurd", label: "Goedgekeurd" },
  { key: "Gearchiveerd", label: "Gearchiveerd" },
  { key: "Verwijderd", label: "Verwijderd" },
] as const

/** Backend-supported lifecycle_status values (pc_product). */
export const LIFECYCLE_STATUS_FILTERS = [
  { key: "", label: "Alle lifecycle-statussen" },
  { key: "Retailer Created", label: "Retailer Created" },
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

export function decideProductApproval(
  productId: string,
  body: { decision: "approved" | "rejected"; reason?: string }
) {
  return request<{ decision: string; version: unknown; lifecycle_status?: string }>(
    `/admin/product-cloud/products/${productId}/approval`,
    { method: "POST", body: JSON.stringify(body) }
  )
}
