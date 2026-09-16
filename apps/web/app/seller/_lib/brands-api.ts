/**
 * Seller Brand API-client — merkcontent + productiefaciliteiten.
 */

import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

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
        : "Merk laden mislukt."
    throw new BrandApiError(message, response.status)
  }
  return body as T
}

export type ManageableBrand = {
  id: string
  name: string
  slug: string
  intro?: string | null
  access_level: string
  product_count?: number
  facility_count?: number
  can_edit_description?: boolean
  can_edit_facilities?: boolean
  can_manage_public_page?: boolean
  public_page_status?: string
  ownership_status?: string | null
  page_flow_status?: string
  page_review_status?: string
  claimed?: boolean
  editor_scope?: string
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
      can_edit_description?: boolean
      can_manage_public_page?: boolean
    }
    ownership?: {
      can_file_claim?: boolean
      claim?: {
        id: string
        status: string
        evidence_note?: string | null
        evidence_url?: string | null
        review_note?: string | null
      } | null
      public_page_status?: string
      page_review_status?: string
      page_review_note?: string | null
      page_flow_status?: string
      claimed?: boolean
      claimed_by_seller_id?: string | null
      editor_scope?: string
    }
    market_content: unknown[]
    facilities: unknown[]
    products?: Array<{
      id: string
      title: string | null
      ean: string | null
      sku: string | null
      identifier_value: string | null
      identifier_type: string | null
      category: string | null
      category_names?: string[]
      status: string
      image_url: string | null
    }>
  }>(`/store/brands/${encodeURIComponent(id)}`)
}

export function patchSellerBrand(
  id: string,
  body: {
    name?: string
    intro?: string | null
    story?: string | null
    website_url?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
    story_title?: string | null
    story_image_url?: string | null
    public_page_status?: "unpublished" | "published"
    submit_for_review?: boolean
    page_document?: {
      category_slugs?: string[]
      product_ids?: string[]
      extra_sections?: Array<{
        id?: string
        type: "text" | "image" | "image_text"
        title?: string | null
        text?: string | null
        image_url?: string | null
      }>
    }
  }
) {
  return request(`/store/brands/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function submitBrandOwnershipClaim(
  id: string,
  body: { evidence_note?: string; evidence_url?: string; file?: File | null }
) {
  const form = new FormData()
  if (body.evidence_note) form.append("evidence_note", body.evidence_note)
  if (body.evidence_url) form.append("evidence_url", body.evidence_url)
  if (body.file) form.append("file", body.file)
  const response = await fetch(
    `${medusaBackendUrl()}/store/brands/${encodeURIComponent(id)}/ownership-claim`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
      body: form,
    }
  )
  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Bewijs indienen mislukt."
    throw new BrandApiError(message, response.status)
  }
  return payload as { claim: unknown }
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

export async function createSellerBrand(body: {
  name: string
  intro?: string | null
}) {
  const res = await request<{ brand?: ManageableBrand | ManageableBrand[] }>(
    "/store/brands",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
  const brand = Array.isArray(res.brand) ? res.brand[0] : res.brand
  if (!brand?.id) {
    throw new BrandApiError("Merk kon niet worden opgeslagen.")
  }
  return { brand }
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
    name?: string | null
    country_code: string
    street?: string | null
    house_number?: string | null
    postal_code?: string | null
    city?: string | null
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

export function deactivateSellerBrandFacility(brandId: string, facilityId: string) {
  return request<{ deleted: boolean; facility_id: string; is_active: boolean }>(
    `/store/brands/${encodeURIComponent(brandId)}/facilities/${encodeURIComponent(facilityId)}`,
    { method: "DELETE" }
  )
}

export function listSellerFacilities() {
  return request<{
    brands: ManageableBrand[]
    facilities: Array<{
      id: string
      name: string
      brand_id: string
      brand_name?: string
      street?: string | null
      house_number?: string | null
      postal_code?: string | null
      city?: string | null
      country_code?: string
      is_active?: boolean
      assembly_eu_band?: string | null
      parts_eu_level?: string | null
      materials_eu_level?: string | null
    }>
    count: number
  }>("/store/product-cloud/facilities")
}

export function listSellerBrandFacilityProducts(brandId: string, facilityId: string) {
  return request<{
    products: Array<{
      id: string
      title: string | null
      brand_id: string
      manufacturer_id: string | null
      ean?: string | null
      sku?: string | null
      brand_name?: string | null
      status?: string | null
    }>
    count: number
  }>(
    `/store/brands/${encodeURIComponent(brandId)}/facilities/${encodeURIComponent(facilityId)}/products`
  )
}
