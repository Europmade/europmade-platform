import { adminFetch } from "./admin-fetch"

export class BrandOwnershipAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "BrandOwnershipAdminApiError"
    this.status = status
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
      typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan."
    throw new BrandOwnershipAdminApiError(message, response.status)
  }
  return body as T
}

export type BrandOwnershipClaimListItem = {
  id: string
  brand_id: string
  brand_name: string
  brand_slug: string | null
  seller_id: string
  seller_name: string | null
  status: string
  evidence_note?: string | null
  evidence_url?: string | null
  evidence_file_id?: string | null
  review_note?: string | null
  created_at?: string
}

export type BrandPageReviewListItem = {
  brand_id: string
  brand_name: string
  brand_slug: string | null
  page_review_status: string
  submitted_by: string | null
  seller_name: string | null
  review_note: string | null
}

export function listBrandOwnershipClaims(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ""
  return request<{
    claims: BrandOwnershipClaimListItem[]
    count: number
    pages?: BrandPageReviewListItem[]
    page_count?: number
  }>(`/admin/brand-ownership${qs}`)
}

export function getBrandOwnershipClaim(id: string) {
  return request<{
    claim: Record<string, unknown>
    brand: Record<string, unknown>
    seller: Record<string, unknown>
    existing_owner?: Record<string, unknown> | null
  }>(`/admin/brand-ownership/${encodeURIComponent(id)}`)
}

export function decideBrandOwnershipClaim(
  id: string,
  body: { action: "approve" | "reject" | "request_info"; note?: string }
) {
  return request(`/admin/brand-ownership/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function getBrandPageReview(brandId: string) {
  return request<{
    brand: Record<string, unknown>
    draft: Record<string, unknown>
    live: Record<string, unknown>
    page_review_status: string
    page_review_note: string | null
    submitted_by: string | null
  }>(`/admin/brand-ownership/pages/${encodeURIComponent(brandId)}`)
}

export function decideBrandPageReview(
  brandId: string,
  body: { action: "approve" | "reject" | "request_info"; note?: string }
) {
  return request(`/admin/brand-ownership/pages/${encodeURIComponent(brandId)}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}
