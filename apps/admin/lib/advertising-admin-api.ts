/**
 * Admin Advertising API client — Medusa /admin/advertising/*
 */

import { adminFetch } from "./admin-fetch"

export class AdvertisingAdminApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AdvertisingAdminApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      (body as { message?: string })?.message ?? `HTTP ${response.status}`
    throw new AdvertisingAdminApiError(message, response.status)
  }
  return body as T
}

export type AdCampaignWeekDto = {
  id: string
  market_code: string
  week_start: string
  week_end: string
  week_price: number
}

export type AdCampaignProductDto = {
  id: string
  title: string | null
  slug: string | null
  image_url: string | null
  href: string
}

export type AdCampaignDto = {
  id: string
  seller_id: string
  seller_name: string
  name: string
  placement: string
  target_type: string
  target_value: string | null
  markets: string[]
  image_url: string | null
  destination_url: string
  headline: string | null
  subline: string | null
  cta_key: string | null
  design_key: string | null
  product_ids: string[]
  campaign_slug: string | null
  seller_public_slug: string | null
  products?: AdCampaignProductDto[]
  status: string
  total_price: number
  admin_note: string | null
  created_at: string
  updated_at: string
  weeks: AdCampaignWeekDto[]
}

export async function listAdCampaigns(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ""
  return request<{ campaigns: AdCampaignDto[] }>(
    `/admin/advertising/campaigns${qs}`
  )
}

export async function getAdCampaign(id: string) {
  return request<{ campaign: AdCampaignDto }>(
    `/admin/advertising/campaigns/${encodeURIComponent(id)}`
  )
}

export async function patchAdCampaign(
  id: string,
  patch: { status?: string; total_price?: number; admin_note?: string }
) {
  return request<{ campaign: AdCampaignDto }>(
    `/admin/advertising/campaigns/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  )
}

export type AdPricingDto = {
  id: string
  placement: string
  market_code: string
  target_type: string
  weekly_price: number
  currency_code: string
  is_active: boolean
}

export async function listAdPricing() {
  return request<{ pricing: AdPricingDto[] }>("/admin/advertising/pricing")
}

export async function createAdPricing(data: {
  placement: string
  market_code?: string
  target_type?: string
  weekly_price: number
}) {
  return request<{ pricing: AdPricingDto }>("/admin/advertising/pricing", {
    method: "POST",
    body: JSON.stringify(data),
  })
}
