/**
 * Store Commerce Cloud-client — Offer CRUD + Buy Box (S3-04-03/04).
 */

import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class CommerceCloudApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "CommerceCloudApiError"
    this.status = status
  }
}

/** Seller-facing message; technical detail stays in console for debugging. */
export function shippingProfileSaveErrorMessage(err: unknown): string {
  const technical =
    err instanceof CommerceCloudApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Onbekende fout"
  if (typeof console !== "undefined") {
    console.error("[shipping-profile] opslaan mislukt:", technical, err)
  }
  if (
    /invalid key in record/i.test(technical) ||
    /^invalid request:/i.test(technical)
  ) {
    return "Het verzendprofiel kon niet worden opgeslagen. Controleer de verzendkosten en landen en probeer het opnieuw."
  }
  if (err instanceof CommerceCloudApiError && err.message.trim()) {
    return err.message
  }
  return "Opslaan mislukt."
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
  seller_sku?: string | null
  sales_status?: "active" | "paused"
  delivery_days_max?: number | null
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
  extra_delivery_cost?: string | number | null
}

export type OfferListItem = {
  offer: OfferRow
  inventory: InventoryRow | null
  price: PriceRow | null
  total_price: number | null
  is_sellable?: boolean
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
  seller_sku?: string | null
  sales_status?: "active" | "paused"
  delivery_days_max?: number | null
  extra_delivery_cost?: number | null
  regular_customer_price?: number | null
  promo_price?: number | null
  promo_starts_at?: string | null
  promo_ends_at?: string | null
  clear_promo?: boolean
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
  seller_sku?: string | null
  sales_status?: "active" | "paused"
  delivery_days_max?: number | null
  extra_delivery_cost?: number | null
  regular_customer_price?: number | null
  promo_price?: number | null
  promo_starts_at?: string | null
  promo_ends_at?: string | null
  clear_promo?: boolean
}

export type OfferDetailResponse = {
  offer: OfferRow
  inventory: InventoryRow | null
  price: PriceRow | null
  total_price: number | null
  is_sellable?: boolean
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

export type DeliveryTimeCode =
  | "same_day"
  | "next_day"
  | "1_2"
  | "2_3"
  | "3_5"
  | "5_plus"

export type ShippingCountryConfig = {
  active: boolean
  shipping_cost: number
  free_shipping: boolean
  free_shipping_threshold?: number | null
  delivery_time_code: DeliveryTimeCode
  delivery_days_max?: number | null
  delivery_weekdays?: number[]
  carrier_ref?: { carrier_id: string; service_id?: string | null } | null
}

export type HandoverDaySetting = {
  enabled: boolean
  cutoff_time: string
  processing_time_code: DeliveryTimeCode
}

export type ProcessingSettings = {
  same_for_all_weekdays: boolean
  default_handover: HandoverDaySetting
  weekdays?: Partial<Record<string, HandoverDaySetting>>
}

export type SellerShippingProfile = {
  id: string
  seller_id: string
  name: string
  description?: string | null
  status: "draft" | "active" | "inactive"
  country_rates: Record<string, ShippingCountryConfig>
  processing_settings: ProcessingSettings
  carrier_mode: "own" | "carrier"
  carrier_ref?: { carrier_id: string; service_id?: string | null } | null
  linked_product_count?: number
  active_country_count?: number
  min_shipping_cost?: number | null
  created_at?: string
  updated_at?: string
}

export function listShippingProfiles() {
  return request<{ shipping_profiles: SellerShippingProfile[] }>(
    "/store/commerce-cloud/shipping-profiles"
  )
}

export function getShippingProfile(id: string) {
  return request<{ shipping_profile: SellerShippingProfile }>(
    `/store/commerce-cloud/shipping-profiles/${id}`
  )
}

export function createShippingProfile(
  body: Partial<SellerShippingProfile> & { name: string }
) {
  const country_rates: Record<string, ShippingCountryConfig> = {}
  for (const [code, row] of Object.entries(body.country_rates || {})) {
    if (!row) continue
    const cost = Number(row.shipping_cost)
    country_rates[code] = {
      ...row,
      shipping_cost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      free_shipping_threshold:
        row.free_shipping_threshold == null
          ? null
          : Number.isFinite(Number(row.free_shipping_threshold))
            ? Number(row.free_shipping_threshold)
            : null,
    }
  }
  return request<{ shipping_profile: SellerShippingProfile }>(
    "/store/commerce-cloud/shipping-profiles",
    {
      method: "POST",
      body: JSON.stringify({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        status: body.status || "draft",
        country_rates,
        processing_settings: body.processing_settings,
        carrier_mode: body.carrier_mode || "own",
        carrier_ref: body.carrier_ref ?? null,
      }),
    }
  )
}

export function patchShippingProfile(
  id: string,
  body: Partial<
    Pick<
      SellerShippingProfile,
      | "name"
      | "description"
      | "status"
      | "country_rates"
      | "processing_settings"
      | "carrier_mode"
      | "carrier_ref"
    >
  >
) {
  return request<{ shipping_profile: SellerShippingProfile }>(
    `/store/commerce-cloud/shipping-profiles/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )
}

export function deleteShippingProfile(id: string) {
  return request<void>(`/store/commerce-cloud/shipping-profiles/${id}`, {
    method: "DELETE",
  })
}

export function duplicateShippingProfile(id: string, name: string) {
  return request<{ shipping_profile: SellerShippingProfile }>(
    `/store/commerce-cloud/shipping-profiles/${id}/duplicate`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    }
  )
}
