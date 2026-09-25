import { adminFetch } from "./admin-fetch"

export class EuropeanOwnershipAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "EuropeanOwnershipAdminApiError"
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
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Er is iets misgegaan."
    throw new EuropeanOwnershipAdminApiError(message, response.status)
  }
  return body as T
}

export type EuropeanOwnershipClaimRow = {
  id: string
  brand_id: string | null
  manufacturer_id: string | null
  company_id: string | null
  seller_id: string
  ownership_band: string
  ownership_band_label: string
  source: string
  source_label: string
  status: string
  evidence_file_id: string | null
  evidence_note: string | null
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

export function listEuropeanOwnershipClaims(status = "all") {
  const qs =
    status && status !== "all"
      ? `?status=${encodeURIComponent(status)}`
      : ""
  return request<{ claims: EuropeanOwnershipClaimRow[]; count: number }>(
    `/admin/product-cloud/european-ownership${qs}`
  )
}

export function getEuropeanOwnershipClaim(id: string) {
  return request<{
    claim: EuropeanOwnershipClaimRow
    brand: { id: string; name?: string } | null
    manufacturer: { id: string; name?: string } | null
    history: Array<{
      id: string
      from_status: string | null
      to_status: string
      note: string | null
      actor_type: string | null
      decision: string | null
      created_at?: string
    }>
  }>(`/admin/product-cloud/european-ownership/${id}`)
}

export function decideEuropeanOwnershipClaim(
  id: string,
  body: {
    decision: "approve" | "request_info" | "reject"
    note?: string
  }
) {
  return request<{ claim: EuropeanOwnershipClaimRow }>(
    `/admin/product-cloud/european-ownership/${id}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}
