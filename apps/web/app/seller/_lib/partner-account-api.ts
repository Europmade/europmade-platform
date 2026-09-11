/**
 * Partner-account API — één Seller/Partner-omgeving (ADR-0041).
 */

import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class PartnerAccountApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "PartnerAccountApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${medusaBackendUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Partneraccount laden mislukt."
    throw new PartnerAccountApiError(message, response.status)
  }
  return body as T
}

export type PartnerAccountResponse = {
  partner: {
    id: string
    customer_id: string
    onboarding_status: string
    is_retailer: boolean
    is_brand_owner: boolean
    is_producer: boolean
    is_producer_or_brand_owner: boolean
    is_distributor: boolean
    roles: string[]
    permissions: string[]
    company: {
      id?: string
      legal_name?: string
      chamber_of_commerce_number?: string
      vat_number?: string | null
      country_code?: string
      iban?: string
    } | null
    logo_url?: string | null
    banner_url?: string | null
  }
  users: Array<{
    id: string
    customer_id: string
    email: string | null
    is_current: boolean
    roles: string[]
  }>
  brands: Array<{
    id: string
    name: string
    product_count: number
    facility_count: number
  }>
}

export function getPartnerAccount() {
  return request<PartnerAccountResponse>("/store/partner/account")
}

export function patchPartnerAccount(body: {
  logo_url?: string | null
  banner_url?: string | null
}) {
  return request<{ partner: PartnerAccountResponse["partner"] }>(
    "/store/partner/account",
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )
}
