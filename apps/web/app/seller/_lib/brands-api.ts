/**
 * Seller Brand API-client — merkcontent + productiefaciliteiten.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class BrandApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "BrandApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
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
        : "Merk laden mislukt."
    throw new BrandApiError(message, response.status)
  }
  return body as T
}

export type ManageableBrand = {
  id: string
  name: string
  slug: string
  access_level: string
}

export function listSellerBrands() {
  return request<{ brands: ManageableBrand[]; count: number }>("/store/brands")
}

export function getSellerBrand(id: string) {
  return request<{
    brand: Record<string, unknown>
    access: {
      level: string
      can_edit_central: boolean
      can_edit_markets: string[]
      can_edit_facilities: boolean
    }
    market_content: unknown[]
    facilities: unknown[]
  }>(`/store/brands/${encodeURIComponent(id)}`)
}

export function patchSellerBrand(
  id: string,
  body: {
    intro?: string | null
    story?: string | null
    website_url?: string | null
    logo_url?: string | null
  }
) {
  return request(`/store/brands/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function patchSellerBrandMarket(
  id: string,
  countryCode: string,
  body: {
    intro?: string | null
    story?: string | null
    contact_info?: string | null
  }
) {
  return request(
    `/store/brands/${encodeURIComponent(id)}/markets/${encodeURIComponent(countryCode)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )
}

export function upsertSellerBrandFacility(
  id: string,
  body: {
    id?: string
    name: string
    country_code: string
    region?: string | null
    description?: string | null
    manufacturer_id?: string | null
    is_active?: boolean
    assembly_eu_band?: string | null
    parts_eu_level?: string | null
    materials_eu_level?: string | null
    primary_assembly_country?: string | null
  }
) {
  return request(`/store/brands/${encodeURIComponent(id)}/facilities`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function uploadSellerBrandMedia(file: File) {
  const form = new FormData()
  form.append("file", file)
  const response = await fetch(`${medusaBackendUrl()}/store/brands/media`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
    },
    body: form,
  })
  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Upload mislukt."
    throw new BrandApiError(message, response.status)
  }
  const url =
    payload &&
    typeof payload === "object" &&
    "url" in payload &&
    typeof payload.url === "string"
      ? payload.url
      : null
  const storage =
    payload &&
    typeof payload === "object" &&
    "storage_reference" in payload &&
    typeof payload.storage_reference === "string"
      ? payload.storage_reference
      : null
  const stored = storage || url
  if (!stored) throw new BrandApiError("Upload mislukt.")
  return { url: url || stored, storage_reference: stored }
}
