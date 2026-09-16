import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class ManufacturerApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ManufacturerApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${medusaBackendUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
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
        : "Fabrikant ophalen mislukt."
    throw new ManufacturerApiError(message, response.status)
  }
  return body as T
}

export type SellerManufacturer = {
  id: string
  name: string
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
  contact_email?: string | null
  contact_phone?: string | null
}

export type UpsertManufacturerInput = {
  name: string
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country_code: string
  contact_email: string
  contact_phone?: string | null
}

export function listSellerManufacturers() {
  return request<{ manufacturers: SellerManufacturer[]; count: number }>(
    "/store/partner/manufacturers"
  )
}

export function createSellerManufacturer(body: UpsertManufacturerInput) {
  return request<{ manufacturer: SellerManufacturer }>(
    "/store/partner/manufacturers",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

export function patchSellerManufacturer(
  id: string,
  body: Partial<UpsertManufacturerInput>
) {
  return request<{ manufacturer: SellerManufacturer }>(
    `/store/partner/manufacturers/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )
}
