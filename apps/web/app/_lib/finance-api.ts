/**
 * Store Finance client — Seller Financiën (S3-08-05).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class FinanceApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "FinanceApiError"
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
    throw new FinanceApiError(message, response.status)
  }
  return body as T
}

export type SellerFinanceCommission = {
  id: string
  order_id: string | null
  order_number: string
  order_subtotal: number
  amount: number
  netto: number
  percentage: number
  status: string
  created_at: string
}

export type SellerFinanceInvoice = {
  id: string
  invoice_type: "Klant-factuur" | "Seller-commissiefactuur"
  order_id: string | null
  order_number: string | null
  total_amount: number
  amount_excl_vat: number
  vat_breakdown: unknown
  issued_at: string
  credit_of_invoice_id: string | null
  period: string | null
  pdf_url: string | null
}

export type SellerFinancePayout = {
  id: string
  amount: number
  currency: string
  period: string
  status: "Gepland" | "In behandeling" | "Voltooid" | "Geannuleerd"
  eligible_at: string
  processed_at: string | null
  order_id: string | null
  order_number: string | null
  stripe_transfer_id: string | null
}

export type SellerFinanceVatRow = {
  country_code: string
  country_label: string
  amount_excl: number
  vat_rate: number
  vat_amount: number
}

export type SellerFinanceOverview = {
  seller_id: string
  summary: {
    net_revenue: number
    commission_held: number
    next_payout_amount: number
    next_payout_eligible_at: string | null
  }
  commissions: SellerFinanceCommission[]
  invoices: SellerFinanceInvoice[]
  payouts: SellerFinancePayout[]
  vat_by_country: SellerFinanceVatRow[]
}

export function getSellerFinanceOverview() {
  return request<SellerFinanceOverview>("/store/finance/seller")
}

export function formatFinanceDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

export function payoutStatusLabel(status: SellerFinancePayout["status"]): string {
  if (status === "Voltooid") return "Uitbetaald"
  return status
}
