export function computeNetSettlement(
  netSales: number,
  invoiceTotal: number
): number {
  return Math.round((netSales - invoiceTotal) * 100) / 100
}

export type SellerSettlementDto = {
  id: string
  seller_id: string
  period_start: string
  period_end: string
  status: string
  created_at: string | null
  closed_at: string | null
  invoice_id: string | null
  payout_id: string | null
  currency: string
  gross_sales: number
  refunds: number
  net_sales: number
  platform_commission: number
  advertising_amount: number
  banner_amount: number
  other_services_amount: number
  credits_amount: number
  invoice_total: number
  amount_before_payout: number
  net_settlement: number
  snapshot: Record<string, unknown> | null
}

export function serializeSellerSettlement(row: any): SellerSettlementDto {
  return {
    id: row.id,
    seller_id: row.seller_id,
    period_start: new Date(row.period_start).toISOString(),
    period_end: new Date(row.period_end).toISOString(),
    status: row.status,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    invoice_id: row.invoice_id ?? null,
    payout_id: row.payout_id ?? null,
    currency: row.currency || "EUR",
    gross_sales: Number(row.gross_sales),
    refunds: Number(row.refunds),
    net_sales: Number(row.net_sales),
    platform_commission: Number(row.platform_commission),
    advertising_amount: Number(row.advertising_amount),
    banner_amount: Number(row.banner_amount),
    other_services_amount: Number(row.other_services_amount),
    credits_amount: Number(row.credits_amount),
    invoice_total: Number(row.invoice_total),
    amount_before_payout: Number(row.amount_before_payout),
    net_settlement: Number(row.net_settlement),
    snapshot: (row.snapshot as Record<string, unknown> | null) ?? null,
  }
}
