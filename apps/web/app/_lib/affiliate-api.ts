/**
 * Store Affiliate-service client (S3-07-02/04/05, S3-01-06).
 */

import { medusaBackendUrl } from "./medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class AffiliateApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "AffiliateApiError"
    this.status = status
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${medusaBackendUrl()}${path}`, {
      ...init,
      credentials: auth ? "include" : "omit",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new AffiliateApiError(
      "Geen verbinding met de server. Probeer het later opnieuw."
    )
  }
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw."
    throw new AffiliateApiError(message, response.status)
  }
  return body as T
}

export type AffiliateRecord = {
  id: string
  customer_id: string
  onboarding_status:
    | "Ingediend"
    | "In beoordeling"
    | "Goedgekeurd"
    | "Afgekeurd"
  channel_url: string | null
  rejection_reason: string | null
  approved_at: string | null
  company_id: string | null
  legal_name?: string | null
  iban_masked?: string | null
}

export type AffiliateLink = {
  id: string
  affiliate_id: string
  target_url: string
  tracking_param: string
  product_id?: string | null
  offer_id?: string | null
  seller_id?: string | null
  commission_percent_snapshot?: number | null
  created_at: string
}

export type AffiliateCoupon = {
  id: string
  affiliate_id: string
  code: string
  status: string
  created_at: string
}

export type DashboardResponse = {
  affiliate: {
    id: string
    onboarding_status: string
    channel_url: string | null
    approved_at: string | null
  }
  period_days: number
  kpis: {
    clicks: number
    conversions: number
    commission_amount: number
    commission_formatted: string
  }
  link_stats: Array<{
    link_id: string
    target_url: string
    tracking_param: string
    display_url: string
    clicks: number
    conversions: number
    conversion_rate: number
    created_at: string
  }>
}

export type CommissionRow = {
  id: string
  created_at: string
  order_id: string
  order_number: string
  attribution_type: string
  amount: number
  amount_formatted: string
  percentage?: number
  status: string
  ui_status: string
  payout_status?: string | null
  eligible_at?: string | null
  payout_id?: string | null
}

export type AffiliatePreference = {
  key: string
  label: string
  enabled: boolean
}

export function getAffiliate() {
  return request<{ affiliate: AffiliateRecord | null; preferences?: AffiliatePreference[] }>(
    "/store/affiliate"
  )
}

export function saveAffiliatePreferences(preferences: Record<string, boolean>) {
  return request<{ preferences: AffiliatePreference[] }>("/store/affiliate", {
    method: "PATCH",
    body: JSON.stringify({ communication_preferences: preferences }),
  })
}

export function registerAffiliate(input: {
  legal_name: string
  channel_url: string
  iban: string
  country_code?: string
}) {
  return request<{ affiliate: AffiliateRecord }>("/store/affiliate", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getAffiliateDashboard() {
  return request<DashboardResponse>("/store/affiliate/dashboard")
}

export function getAffiliateStats() {
  return request<{
    period_days: number
    link_stats: DashboardResponse["link_stats"]
  }>("/store/affiliate/stats")
}

export function getAffiliateCommissions() {
  return request<{ commissions: CommissionRow[] }>(
    "/store/affiliate/commissions"
  )
}

export function listAffiliateLinks() {
  return request<{ links: AffiliateLink[] }>("/store/affiliate/links")
}

export function createAffiliateLink(
  input:
    | string
    | {
        target_url: string
        product_id?: string
        offer_id?: string
        seller_id?: string
      }
) {
  const body = typeof input === "string" ? { target_url: input } : input
  return request<{ link: AffiliateLink }>("/store/affiliate/links", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function listAffiliateCoupons() {
  return request<{ coupons: AffiliateCoupon[] }>("/store/affiliate/coupons")
}

export function createAffiliateCoupon(code?: string) {
  return request<{ coupon: AffiliateCoupon }>("/store/affiliate/coupons", {
    method: "POST",
    body: JSON.stringify(code ? { code } : {}),
  })
}

export function recordConsent(visitor_key: string, consent_given: boolean) {
  return request<{ consent_id: string; consent_given: boolean }>(
    "/store/affiliate/consent",
    {
      method: "POST",
      body: JSON.stringify({ visitor_key, consent_given }),
    },
    false
  )
}

export function trackAffiliateClick(
  tracking_param: string,
  visitor_key: string
) {
  return request<{
    click_id: string
    attribution_expires_at: string
    attribution_days: number
  }>(
    "/store/affiliate/clicks",
    {
      method: "POST",
      body: JSON.stringify({ tracking_param, visitor_key }),
    },
    false
  )
}

export type AffiliatePayoutRow = {
  id: string
  amount: number
  currency: string
  period: string
  status: string
  eligible_at: string
  processed_at: string | null
  order_id: string | null
  stripe_transfer_id: string | null
  settlement_available?: boolean
}

export function getAffiliatePayouts() {
  return request<{
    affiliate_id: string
    payouts: AffiliatePayoutRow[]
  }>("/store/finance/affiliate/payouts")
}

export function getAffiliatePayoutSettlement(payoutId: string) {
  return request<{
    settlement: {
      number: string
      payout_id: string
      issued_at: string
      period: string
      currency: string
      payout_status: string
      europmade: Record<string, string>
      affiliate: Record<string, string | null>
      lines: Array<{
        order_id: string | null
        order_number: string | null
        commission_id: string | null
        commission_percentage: number | null
        amount: number
        description: string
      }>
      total: number
      note: string
    }
  }>(`/store/finance/affiliate/payouts/${encodeURIComponent(payoutId)}/settlement`)
}

export type CommissionSettings = {
  percentage: number
  percentage_display: string
  attribution_days: number
}

/** Active platform default from affiliate_commission_setting (ADR-0030). */
export function getAffiliateCommissionSettings() {
  return request<CommissionSettings>("/store/affiliate/commission-settings")
}

/** Build shareable affiliate URL from target + tracking_param. */
export function buildAffiliateShareUrl(
  targetUrl: string,
  trackingParam: string,
  origin?: string
): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "")
  let path = targetUrl.trim()
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path)
      u.searchParams.set("ref", trackingParam)
      return u.toString()
    } catch {
      /* fall through */
    }
  }
  if (!path.startsWith("/")) path = `/${path}`
  const joiner = path.includes("?") ? "&" : "?"
  return `${base}${path}${joiner}ref=${encodeURIComponent(trackingParam)}`
}

export function productAffiliateTargetPath(
  productId: string,
  offerId?: string
): string {
  const path = `/product/${encodeURIComponent(productId)}`
  if (!offerId) return path
  return `${path}?offer=${encodeURIComponent(offerId)}`
}

/** ADR-0030: 5% of unit price (excl. shipping). Uses live commission-setting percentage. */
export function estimateAffiliateCommission(
  unitPrice: number,
  percentage: number
): number {
  if (!Number.isFinite(unitPrice) || !Number.isFinite(percentage)) return 0
  return Math.round(unitPrice * percentage * 100) / 100
}
