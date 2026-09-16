import { adminFetch } from "./admin-fetch"

export class ProductLinkAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ProductLinkAdminApiError"
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
    throw new ProductLinkAdminApiError(message, response.status)
  }
  return body as T
}

export type ProductLinkMemberRow = {
  id: string
  product_id: string
  product_title?: string | null
  values: Record<string, string>
  values_key: string
  sort_order: number
  is_active_slot: boolean
}

export type ProductLinkGroupRow = {
  id: string
  name: string
  dimensions: string[]
  status: string
  submitter_seller_id: string
  note: string | null
  decision_reason: string | null
  decided_by: string | null
  decided_at: string | null
  created_at?: string
  members: ProductLinkMemberRow[]
}

export function listProductLinkGroups(status?: string) {
  const qs =
    status && status !== "proposed"
      ? `?status=${encodeURIComponent(status)}`
      : ""
  return request<{ product_link_groups: ProductLinkGroupRow[]; count: number }>(
    `/admin/product-cloud/product-link-groups${qs}`
  )
}

export function getProductLinkGroup(id: string) {
  return request<{ product_link_group: ProductLinkGroupRow }>(
    `/admin/product-cloud/product-link-groups/${id}`
  )
}

export function decideProductLinkGroup(
  id: string,
  decision: "approve" | "reject",
  decision_reason?: string
) {
  return request<{ product_link_group: ProductLinkGroupRow }>(
    `/admin/product-cloud/product-link-groups/${id}/decide`,
    {
      method: "POST",
      body: JSON.stringify({
        decision,
        decision_reason: decision_reason || undefined,
      }),
    }
  )
}
