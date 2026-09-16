import { adminFetch } from "./admin-fetch"

export class ComplianceAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ComplianceAdminApiError"
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
    throw new ComplianceAdminApiError(message, response.status)
  }
  return body as T
}

export type ComplianceEvidenceRow = {
  id: string
  product_id: string
  product_title: string | null
  ean?: string | null
  seller_id?: string | null
  seller_name?: string | null
  uploaded_by_customer_id?: string | null
  evidence_kind: string
  document_type: string
  storage_reference: string
  file_name?: string | null
  mime_type?: string | null
  verification_status: string
  verification_result?: string | null
  verification_notes?: string | null
  created_at?: string
}

export function listComplianceEvidence(status = "pending", sellerId?: string) {
  const sp = new URLSearchParams({ status })
  if (sellerId) sp.set("seller_id", sellerId)
  return request<{ evidence: ComplianceEvidenceRow[]; count: number }>(
    `/admin/product-cloud/compliance/evidence?${sp.toString()}`
  )
}

export function reviewComplianceEvidence(
  productId: string,
  evidenceId: string,
  body: { status: "approved" | "rejected"; reason?: string }
) {
  return request<{ evidence: ComplianceEvidenceRow }>(
    `/admin/product-cloud/products/${productId}/evidence/${evidenceId}/review`,
    { method: "POST", body: JSON.stringify(body) }
  )
}
