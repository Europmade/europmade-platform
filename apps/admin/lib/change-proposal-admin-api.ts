import { adminFetch } from "./admin-fetch"

export class ChangeProposalAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ChangeProposalAdminApiError"
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
    throw new ChangeProposalAdminApiError(message, response.status)
  }
  return body as T
}

export type AdminChangeProposal = {
  id: string
  product_id: string
  submitter_seller_id: string
  proposed_title: string | null
  proposed_description: string | null
  toelichting: string
  status: string
  decision_reason: string | null
  created_at?: string
}

export function listChangeProposals(status = "In behandeling") {
  const qs =
    status === "In behandeling"
      ? ""
      : `?status=${encodeURIComponent(status)}`
  return request<{ change_proposals: AdminChangeProposal[]; count: number }>(
    `/admin/product-cloud/change-proposals${qs}`,
    { cache: "no-store" }
  )
}

export function decideChangeProposal(
  id: string,
  decision: "accept" | "reject",
  decision_reason?: string
) {
  return request<{ change_proposal: AdminChangeProposal }>(
    `/admin/product-cloud/change-proposals/${id}/decide`,
    {
      method: "POST",
      body: JSON.stringify({
        decision,
        decision_reason: decision_reason || undefined,
      }),
    }
  )
}
