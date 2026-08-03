/**
 * Store Affiliate-service client (S3-07-02/04/05, S3-01-06).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
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
    response = await fetch(`${BACKEND_URL}${path}`, {
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
}

export type AffiliateLink = {
  id: string
  affiliate_id: string
  target_url: string
  tracking_param: string
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
  status: string
  ui_status: string
}

export function getAffiliate() {
  return request<{ affiliate: AffiliateRecord | null }>("/store/affiliate")
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

export function createAffiliateLink(target_url: string) {
  return request<{ link: AffiliateLink }>("/store/affiliate/links", {
    method: "POST",
    body: JSON.stringify({ target_url }),
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
