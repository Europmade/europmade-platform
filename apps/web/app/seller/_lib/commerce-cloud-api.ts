/**
 * Store Commerce Cloud-client — Offer CRUD + Buy Box (S3-04-03/04).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class CommerceCloudApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "CommerceCloudApiError"
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
        : "Er is iets misgegaan. Probeer het opnieuw."
    throw new CommerceCloudApiError(message, response.status)
  }

  return body as T
}

export type OfferRow = {
  id: string
  seller_id: string
  identifier_id: string
  region_code: string
}

export type InventoryRow = {
  id: string
  offer_id: string
  quantity_available: number
}

export type PriceRow = {
  id: string
  offer_id: string
  base_price: string | number
  shipping_cost: string | number
  vat_rate: number
}

export type OfferListItem = {
  offer: OfferRow
  inventory: InventoryRow | null
  price: PriceRow | null
  total_price: number | null
}

export type BuyBoxWeights = {
  price: number
  delivery: number
  seller_review: number
  stock: number
  performance: number
  returns: number
}

export type OfferBuyBoxPosition = {
  status: string
  source?: string
  winning_offer_id?: string | null
  is_winner?: boolean
  rank?: number | null
  ranked_count?: number
  competing_offer_count?: number
  weights?: BuyBoxWeights
  computed_at?: string | Date
  message?: string
}

export type UpsertOfferInput = {
  identifier_id: string
  region_code: string
  quantity_available: number
  base_price: number
  shipping_cost: number
  vat_rate?: number
}

export type UpsertOfferResult = {
  offer_id: string
  inventory_id: string
  price_id: string
  created: boolean
  buy_box?: {
    winning_offer_id: string | null
    ranked: Array<{
      offer_id: string
      rank: number
      is_winner: boolean
      score: number
    }>
    weights?: BuyBoxWeights
    computed_at?: string | Date
  }
}

export type PatchOfferInput = {
  quantity_available?: number
  base_price?: number
  shipping_cost?: number
  vat_rate?: number
}

export type OfferDetailResponse = {
  offer: OfferRow
  inventory: InventoryRow | null
  price: PriceRow | null
  total_price: number | null
  product_preview: {
    product_id: string
    title: string | null
    brand_id: string
    lifecycle_status: string
    category_names: string[]
    identifier_type: string | null
    identifier_value: string | null
  }
  buy_box: OfferBuyBoxPosition
}

export function listOffers(params?: {
  identifier_id?: string
  region_code?: string
}) {
  const q = new URLSearchParams()
  if (params?.identifier_id) q.set("identifier_id", params.identifier_id)
  if (params?.region_code) q.set("region_code", params.region_code)
  const qs = q.toString()
  return request<{
    offers: OfferListItem[]
    count: number
    product_preview: OfferDetailResponse["product_preview"] | null
  }>(`/store/commerce-cloud/offers${qs ? `?${qs}` : ""}`)
}

export function getOffer(id: string) {
  return request<OfferDetailResponse>(`/store/commerce-cloud/offers/${id}`)
}

export function upsertOffer(body: UpsertOfferInput) {
  return request<UpsertOfferResult>("/store/commerce-cloud/offers", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function patchOffer(id: string, body: PatchOfferInput) {
  return request<UpsertOfferResult>(`/store/commerce-cloud/offers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function withdrawOffer(id: string) {
  return request<{
    withdrawn: boolean
    offer_id: string
    identifier_id: string
    region_code: string
  }>(`/store/commerce-cloud/offers/${id}`, {
    method: "DELETE",
  })
}
