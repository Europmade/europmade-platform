/**
 * Admin Finance API — read-only views over bestaande finance-module.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export class FinanceAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "FinanceAdminApiError"
    this.status = status
  }
}

export const FINANCE_PERIODS = [
  { key: "last_7_days", label: "7 dagen" },
  { key: "last_30_days", label: "30 dagen" },
  { key: "last_90_days", label: "90 dagen" },
  { key: "this_year", label: "Dit jaar" },
  { key: "all_time", label: "Alles" },
] as const

export type FinancePeriodKey = (typeof FINANCE_PERIODS)[number]["key"]

export type FinanceTxnType =
  | "platform_commission"
  | "affiliate_commission"
  | "seller_payout"
  | "affiliate_payout"
  | "refund"

export const FINANCE_TXN_TYPE_LABELS: Record<FinanceTxnType, string> = {
  platform_commission: "Platformcommissie",
  affiliate_commission: "Affiliatecommissie",
  seller_payout: "Seller-uitbetaling",
  affiliate_payout: "Affiliate-uitbetaling",
  refund: "Terugbetaling",
}

export type FinancePeriodMeta = {
  key: string
  label: string
  from: string | null
  to: string
}

export type FinanceOverview = {
  period: FinancePeriodMeta
  kpis: {
    revenue: number
    platform_commission: number
    seller_amount: number
    affiliate_commission: number
    payouts_scheduled: number
    payouts_processing: number
    payouts_paid: number
    reversed: number
    transaction_count: number
    open_payout_count: number
    processing_payout_count: number
    paid_payout_count: number
    reversed_commission_count: number
    order_count: number
  }
  notes: Record<string, string>
}

export type FinanceTransaction = {
  id: string
  source: "commission" | "payout" | "invoice"
  type: FinanceTxnType
  created_at: string
  order_id: string | null
  order_number: string | null
  party_type: string
  party_id: string | null
  party_name: string | null
  amount: number
  currency: string
  status: string
  commission_amount: number | null
  payout_status: string | null
  eligible_at: string | null
  processed_at: string | null
  reference: string | null
}

export type FinancePayout = {
  id: string
  recipient_type: string
  seller_id: string | null
  seller_name: string | null
  affiliate_id: string | null
  affiliate_name: string | null
  amount: number
  currency: string
  status: string
  period: string
  eligible_at: string | null
  processed_at: string | null
  created_at: string | null
  order_id: string | null
  order_number: string | null
  stripe_transfer_id: string | null
  process_available: boolean
  process_note: string
  commissions?: Array<{
    id: string
    recipient_type: string
    amount: number
    percentage: number
    status: string
  }>
}

export type FinanceSellerRow = {
  seller_id: string
  seller_name: string
  revenue: number
  platform_commission: number
  seller_amount: number
  payout_open: number
  payout_paid: number
  payout_reversed: number
  order_count: number
  last_activity_at: string | null
}

export type FinanceAffiliateRow = {
  affiliate_id: string
  affiliate_name: string
  status: string | null
  revenue: number
  commission: number
  commission_open: number
  payout: number
  payout_paid: number
  payout_reversed: number
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Finance laden mislukt."
    throw new FinanceAdminApiError(message, response.status)
  }
  return body as T
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const out = search.toString()
  return out ? `?${out}` : ""
}

export function getFinanceOverview(period: FinancePeriodKey) {
  return request<FinanceOverview>(
    `/admin/finance/overview${qs({ period })}`
  )
}

export function listFinanceTransactions(params: {
  period: FinancePeriodKey
  q?: string
  type?: string
  status?: string
  seller_id?: string
  affiliate_id?: string
  limit?: number
  offset?: number
}) {
  return request<{
    period: FinancePeriodMeta
    count: number
    limit: number
    offset: number
    transactions: FinanceTransaction[]
  }>(
    `/admin/finance/transactions${qs({
      period: params.period,
      q: params.q,
      type: params.type,
      status: params.status,
      seller_id: params.seller_id,
      affiliate_id: params.affiliate_id,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })}`
  )
}

export function getFinanceTransaction(id: string) {
  return request<{
    transaction: FinanceTransaction
    payout: FinancePayout | null
    commissions: Array<{
      id: string
      recipient_type: string
      amount: number
      percentage: number
      status: string
      created_at: string
    }>
    refunds: Array<{
      id: string
      total_amount: number
      issued_at: string
      credit_of_invoice_id: string | null
    }>
  }>(`/admin/finance/transactions/${encodeURIComponent(id)}`)
}

export function listFinanceSellers(params: {
  period: FinancePeriodKey
  q?: string
  limit?: number
  offset?: number
}) {
  return request<{
    period: FinancePeriodMeta
    count: number
    sellers: FinanceSellerRow[]
  }>(
    `/admin/finance/sellers${qs({
      period: params.period,
      q: params.q,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })}`
  )
}

export function getFinanceSeller(id: string, period: FinancePeriodKey) {
  return request<{
    period: FinancePeriodMeta
    seller: FinanceSellerRow
    payouts: FinancePayout[]
    transactions: FinanceTransaction[]
  }>(`/admin/finance/sellers/${encodeURIComponent(id)}${qs({ period })}`)
}

export function listFinanceAffiliates(params: {
  period: FinancePeriodKey
  q?: string
  limit?: number
  offset?: number
}) {
  return request<{
    period: FinancePeriodMeta
    count: number
    affiliates: FinanceAffiliateRow[]
  }>(
    `/admin/finance/affiliates${qs({
      period: params.period,
      q: params.q,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })}`
  )
}

export function getFinanceAffiliate(id: string, period: FinancePeriodKey) {
  return request<{
    period: FinancePeriodMeta
    affiliate: FinanceAffiliateRow
    payouts: FinancePayout[]
    transactions: FinanceTransaction[]
  }>(`/admin/finance/affiliates/${encodeURIComponent(id)}${qs({ period })}`)
}

export function listFinancePayouts(params: {
  period: FinancePeriodKey
  q?: string
  status?: string
  recipient_type?: string
  limit?: number
  offset?: number
}) {
  return request<{
    period: FinancePeriodMeta
    count: number
    payouts: FinancePayout[]
  }>(
    `/admin/finance/payouts${qs({
      period: params.period,
      q: params.q,
      status: params.status,
      recipient_type: params.recipient_type,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })}`
  )
}

export function getFinancePayout(id: string) {
  return request<{ payout: FinancePayout }>(
    `/admin/finance/payouts/${encodeURIComponent(id)}`
  )
}

export function formatFinanceEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

export function formatFinanceDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
