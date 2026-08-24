/**
 * Publieke Store Catalog-client (Product Cloud + Buy Box + reviews).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class CatalogApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "CatalogApiError"
    this.status = status
  }
}

async function request<T>(
  path: string,
  timeoutMs = 4_000,
  cache: RequestCache = "force-cache",
  externalSignal?: AbortSignal
): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onExternalAbort = () => controller.abort()
  if (externalSignal?.aborted) controller.abort()
  else externalSignal?.addEventListener("abort", onExternalAbort)
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
      cache: cache === "no-store" ? "no-store" : undefined,
      next: cache === "no-store" ? { revalidate: 0 } : { revalidate: 30 },
      signal: controller.signal,
    })
    const body: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      const message =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : "Catalogus laden mislukt."
      throw new CatalogApiError(message, response.status)
    }
    return body as T
  } catch (err) {
    if (err instanceof CatalogApiError) throw err
    if (err instanceof Error && err.name === "AbortError") {
      if (!timedOut) throw err
      throw new CatalogApiError("Catalogus timeout.", 408)
    }
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new CatalogApiError("Catalogus timeout.", 408)
    }
    throw err
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener("abort", onExternalAbort)
  }
}

export type CatalogListProduct = {
  id: string
  title: string
  description: string | null
  lifecycle_status: string
  brand_name: string | null
  manufacturer_id: string | null
  manufacturer_name: string | null
  category_names: string[]
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
  country_code: string | null
  offer_count: number
  from_price: number | null
  average_review_score: number | null
  review_count: number
  image_url?: string | null
}

export type CatalogOffer = {
  offer_id: string
  seller_id: string
  seller_name: string
  base_price: number
  shipping_cost: number
  total_price: number
  quantity_available: number
  rank: number
  is_winner: boolean
  score: number
}

export type CatalogReview = {
  id: string
  score: number
  text: string | null
  created_at: string
  review_type?: string
}

export type CatalogProductionFacility = {
  id: string
  name: string
  country_code: string
  region: string | null
  description: string | null
  manufacturer_id: string | null
  source: "facility" | "product_origin"
  assembly_eu_band?: string | null
  parts_eu_level?: string | null
  materials_eu_level?: string | null
  primary_assembly_country?: string | null
  made_in_europe_score?: number | null
  is_made_in_europe?: boolean
}

export type CatalogBrandProfile = {
  id: string
  name: string
  slug: string
  intro: string | null
  story: string | null
  website_url: string | null
  logo_url: string | null
  country_code: string | null
  product_count: number
  verified_product_count: number
  market_country: string
  market_intro: string | null
  market_story: string | null
  market_contact: string | null
  facilities: CatalogProductionFacility[]
}

export type CatalogBrandPage = {
  brand: CatalogBrandProfile
  products: CatalogListProduct[]
}

export type CatalogManufacturerProfile = {
  id: string
  name: string
  slug: string
  country_code: string | null
  product_count: number
  verified_product_count: number
}

export type CatalogManufacturerPage = {
  manufacturer: CatalogManufacturerProfile
  products: CatalogListProduct[]
}

export type CatalogMadeInEurope = {
  is_made_in_europe: boolean
  score: number | null
  assembly_points: number
  parts_points: number
  materials_points: number
  max_assembly: number
  max_parts: number
  max_materials: number
  assembly_eu_band: string
  parts_eu_level: string
  materials_eu_level: string
  primary_assembly_country: string | null
  facility: {
    id: string
    name: string
    country_code: string
    region: string | null
  } | null
}

export type CatalogProductDetail = {
  product: {
    id: string
    title: string
    description: string
    lifecycle_status: string
    brand_name: string | null
    manufacturer_name: string | null
    category_names: string[]
    identifier_id: string | null
    identifier_type: string | null
    identifier_value: string | null
    country_code: string | null
    image_url?: string | null
  }
  made_in_europe?: CatalogMadeInEurope | null
  buy_box: {
    source: string
    identifier_id: string
    region_code: string
    winning_offer_id: string | null
    ranked: unknown[]
    weights: Record<string, number>
    computed_at: string
  } | null
  offers: CatalogOffer[]
  reviews: CatalogReview[]
  seller_reviews: CatalogReview[]
  seller_review_aggregate: {
    average_score: number | null
    count: number
  }
}

export function listCatalogProducts(params?: {
  category?: string
  brand?: string
  manufacturer?: string
  country?: string
  q?: string
  price_min?: number
  price_max?: number
  verified?: boolean
  sort?: string
  offset?: number
  limit?: number
  region_code?: string
  signal?: AbortSignal
}) {
  const qs = new URLSearchParams()
  if (params?.category) qs.set("category", params.category)
  if (params?.brand) qs.set("brand", params.brand)
  if (params?.manufacturer) qs.set("manufacturer", params.manufacturer)
  if (params?.country) qs.set("country", params.country)
  if (params?.q) qs.set("q", params.q)
  if (params?.price_min != null) qs.set("price_min", String(params.price_min))
  if (params?.price_max != null) qs.set("price_max", String(params.price_max))
  if (params?.verified != null) qs.set("verified", String(params.verified))
  if (params?.sort) qs.set("sort", params.sort)
  if (params?.offset != null) qs.set("offset", String(params.offset))
  if (params?.limit != null) qs.set("limit", String(params.limit))
  if (params?.region_code) qs.set("region_code", params.region_code)
  const query = qs.toString()
  return request<{
    products: CatalogListProduct[]
    count: number
    offset: number
    limit: number
  }>(
    `/store/catalog/products${query ? `?${query}` : ""}`,
    params?.q ? 15_000 : 12_000,
    params?.q ? "no-store" : "force-cache",
    params?.signal
  )
}

export function getCatalogBrand(
  slug: string,
  opts?: { region_code?: string; locale?: string }
) {
  const qs = new URLSearchParams()
  if (opts?.region_code) qs.set("region_code", opts.region_code)
  if (opts?.locale) qs.set("locale", opts.locale)
  const query = qs.toString()
  return request<CatalogBrandPage>(
    `/store/catalog/brands/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`,
    60_000
  )
}

export function getCatalogManufacturer(slug: string, region_code = "NL") {
  const qs = new URLSearchParams({ region_code })
  return request<CatalogManufacturerPage>(
    `/store/catalog/manufacturers/${encodeURIComponent(slug)}?${qs}`,
    60_000
  )
}

export function getCatalogProduct(productId: string, region_code = "NL") {
  const qs = new URLSearchParams({ region_code })
  return request<CatalogProductDetail>(
    `/store/catalog/products/${encodeURIComponent(productId)}?${qs}`
  )
}
