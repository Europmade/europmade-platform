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

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4_000)
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
      next: { revalidate: 30 },
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
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.name === "TimeoutError")
    ) {
      throw new CatalogApiError("Catalogus timeout.", 408)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export type CatalogListProduct = {
  id: string
  title: string
  description: string | null
  lifecycle_status: string
  brand_name: string | null
  category_names: string[]
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
  country_code: string | null
  offer_count: number
  from_price: number | null
  average_review_score: number | null
  review_count: number
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
  }
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
  q?: string
  region_code?: string
}) {
  const qs = new URLSearchParams()
  if (params?.category) qs.set("category", params.category)
  if (params?.q) qs.set("q", params.q)
  if (params?.region_code) qs.set("region_code", params.region_code)
  const query = qs.toString()
  return request<{ products: CatalogListProduct[]; count: number }>(
    `/store/catalog/products${query ? `?${query}` : ""}`
  )
}

export function getCatalogProduct(productId: string, region_code = "NL") {
  const qs = new URLSearchParams({ region_code })
  return request<CatalogProductDetail>(
    `/store/catalog/products/${encodeURIComponent(productId)}?${qs}`
  )
}
