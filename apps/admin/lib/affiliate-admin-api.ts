/**
 * Admin Affiliate API client — Medusa /admin/affiliates/*
 */

import { adminFetch } from "./admin-fetch"

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      (body as { message?: string })?.message ?? `HTTP ${response.status}`
    throw new Error(message)
  }
  return body as T
}

export type AffiliateRow = {
  id: string
  customer_id: string
  company_id?: string | null
  onboarding_status: string
  created_at: string
  approved_at?: string | null
  channel_url?: string | null
  rejection_reason?: string | null
  legal_name?: string | null
  iban_masked?: string | null
  company_name?: string | null
  email?: string | null
}

export function affiliateNeedsReview(status: string): boolean {
  return status === "Ingediend" || status === "In beoordeling"
}

export function displayAffiliateStatus(status: string): string {
  if (status === "Afgekeurd") return "Afgewezen"
  return status
}

export async function listAffiliates(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ""
  return request<{ affiliates: AffiliateRow[] }>(`/admin/affiliates${qs}`)
}

export async function getAffiliate(id: string) {
  return request<{ affiliate: AffiliateRow }>(`/admin/affiliates/${id}`)
}

export async function approveAffiliate(id: string) {
  return request<{ affiliate: AffiliateRow }>(
    `/admin/affiliates/${id}/approve`,
    { method: "POST" }
  )
}

export async function rejectAffiliate(id: string, reason: string) {
  return request<{ affiliate: AffiliateRow }>(
    `/admin/affiliates/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  )
}

export const AFFILIATE_PERFORMANCE_PERIODS = [
  { days: 7, label: "7 dagen" },
  { days: 30, label: "30 dagen" },
  { days: 90, label: "90 dagen" },
] as const

export type AffiliatePerformancePeriodDays = 7 | 30 | 90

export type AffiliateLinkStat = {
  link_id: string
  target_url: string
  tracking_param: string
  display_url: string
  clicks: number
  conversions: number
  conversion_rate: number
  created_at: string
}

export type AffiliatePerformanceRow = {
  affiliate_id: string
  customer_id: string
  legal_name: string | null
  status: string
  onboarding_status: string
  created_at: string
  clicks: number
  conversions: number
  orders: number
  revenue: number
  commission_awarded: number
  payout_open: number
  conversion_rate: number
  link_stats: AffiliateLinkStat[]
}

export type AffiliatePerformanceTotals = {
  active_affiliates: number
  pending_affiliates: number
  clicks: number
  conversions: number
  orders: number
  revenue: number
  commission_awarded: number
  payouts_scheduled: number
  payout_open: number
  conversion_rate: number
}

export type AffiliatePerformanceResponse = {
  period_days: AffiliatePerformancePeriodDays
  period_from: string
  period_to: string
  conversion_rate_definition: string
  totals: AffiliatePerformanceTotals
  affiliates: AffiliatePerformanceRow[]
}

export async function getAffiliatePerformance(
  periodDays: AffiliatePerformancePeriodDays = 30
) {
  return request<AffiliatePerformanceResponse>(
    `/admin/affiliates/performance?period_days=${periodDays}`
  )
}

export type AdminCommissionSettings = {
  percentage: number
  percentage_display: string
  attribution_days: number
  payout_hold_days: number
}

export async function getAffiliateCommissionSettings() {
  return request<AdminCommissionSettings>(
    "/admin/affiliates/commission-settings"
  )
}

export async function updateAffiliateCommissionSettings(input: {
  percentage: number
  attribution_days?: number
}) {
  return request<AdminCommissionSettings>(
    "/admin/affiliates/commission-settings",
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  )
}
