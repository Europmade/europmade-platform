/**
 * Read-only Admin Finance aggregations over existing finance + order tables.
 * No new ledger; no business-rule changes.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { FINANCE_MODULE } from "../../../modules/finance"
import type FinanceModuleService from "../../../modules/finance/service"
import { ORDER_MODULE } from "../../../modules/order-service"
import type OrderServiceModuleService from "../../../modules/order-service/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import type AffiliateModuleService from "../../../modules/affiliate/service"

export const FINANCE_SCAN_TAKE = 10_000
export const OPEN_PAYOUT_STATUSES = new Set(["Gepland", "In behandeling"])

export const FINANCE_PERIODS = [
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "this_year",
  "all_time",
] as const

export type FinancePeriodKey = (typeof FINANCE_PERIODS)[number]

export type FinancePeriodRange = {
  key: FinancePeriodKey
  from: Date | null
  to: Date
  label: string
}

const PERIOD_LABELS: Record<FinancePeriodKey, string> = {
  last_7_days: "7 dagen",
  last_30_days: "30 dagen",
  last_90_days: "90 dagen",
  this_year: "Dit jaar",
  all_time: "Alles",
}

export type FinanceTxnType =
  | "platform_commission"
  | "affiliate_commission"
  | "seller_payout"
  | "affiliate_payout"
  | "refund"

export type FinanceTxnRow = {
  id: string
  source: "commission" | "payout" | "invoice"
  type: FinanceTxnType
  created_at: string
  order_id: string | null
  order_number: string | null
  party_type: "platform" | "seller" | "affiliate" | "customer"
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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function moneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") return Number(value) || 0
  if (value && typeof value === "object" && "numeric" in value) {
    return Number((value as { numeric: string }).numeric) || 0
  }
  return Number(value) || 0
}

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

function asTime(value: Date | string | null | undefined): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

function startOfYear(now: Date): Date {
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function parseFinancePeriod(value: unknown): FinancePeriodKey {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw === "string" && (FINANCE_PERIODS as readonly string[]).includes(raw)) {
    return raw as FinancePeriodKey
  }
  return "last_30_days"
}

export function resolveFinancePeriodRange(
  key: FinancePeriodKey,
  now = new Date()
): FinancePeriodRange {
  const to = now
  if (key === "all_time") {
    return { key, from: null, to, label: PERIOD_LABELS[key] }
  }
  if (key === "this_year") {
    return { key, from: startOfYear(now), to, label: PERIOD_LABELS[key] }
  }
  const days = key === "last_7_days" ? 7 : key === "last_90_days" ? 90 : 30
  const from = new Date(now)
  from.setDate(from.getDate() - days)
  return { key, from, to, label: PERIOD_LABELS[key] }
}

export function isInFinancePeriod(
  iso: Date | string | null | undefined,
  range: FinancePeriodRange
): boolean {
  const t = asTime(iso)
  if (!t) return false
  if (range.from && t < range.from.getTime()) return false
  if (t > range.to.getTime()) return false
  return true
}

function readQueryString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0].trim()
  }
  return null
}

export function parseLimitOffset(query: Record<string, unknown> | undefined): {
  limit: number
  offset: number
} {
  const limitRaw = Number(readQueryString(query?.limit) ?? 50)
  const offsetRaw = Number(readQueryString(query?.offset) ?? 0)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
    : 50
  const offset = Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0
  return { limit, offset }
}

type LoadedFinance = {
  commissions: Array<{
    id: string
    recipient_type: string
    order_id: string | null
    conversion_id: string | null
    amount: unknown
    percentage: number
    status: string
    created_at: Date | string
  }>
  payouts: Array<{
    id: string
    recipient_type: string
    seller_id: string | null
    affiliate_id: string | null
    amount: unknown
    period: string
    status: string
    currency: string
    eligible_at: Date | string
    processed_at: Date | string | null
    stripe_transfer_id: string | null
    order_id: string | null
    created_at: Date | string
  }>
  invoices: Array<{
    id: string
    invoice_type: string
    order_id: string | null
    seller_id: string | null
    total_amount: unknown
    issued_at: Date | string
    credit_of_invoice_id: string | null
    period: string | null
  }>
  orders: Array<{
    id: string
    order_number: string
    seller_id: string
    created_at: Date | string
    payment_status: string
  }>
  lineTotalByOrder: Map<string, number>
  sellerNameById: Map<string, string>
  affiliateNameById: Map<string, string>
  affiliateStatusById: Map<string, string>
}

export async function loadAdminFinanceSnapshot(
  container: MedusaContainer
): Promise<LoadedFinance> {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const ordersSvc = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService

  const [commissions, payouts, invoices, orders, lines, sellers, affiliates] =
    await Promise.all([
      finance.listCommissions({}, { take: FINANCE_SCAN_TAKE, order: { created_at: "DESC" } }),
      finance.listPayouts({}, { take: FINANCE_SCAN_TAKE, order: { created_at: "DESC" } }),
      finance.listInvoices({}, { take: FINANCE_SCAN_TAKE, order: { created_at: "DESC" } }),
      ordersSvc.listEmOrders({}, { take: FINANCE_SCAN_TAKE, order: { created_at: "DESC" } }),
      ordersSvc.listOrderLines({}, { take: FINANCE_SCAN_TAKE }),
      partner.listSellers({}, { take: 2000, relations: ["company"] }),
      aff.listAffiliates({}, { take: 500, order: { created_at: "DESC" } }),
    ])

  const lineTotalByOrder = new Map<string, number>()
  for (const line of lines) {
    const orderId = String((line as { order_id?: string }).order_id ?? "")
    if (!orderId) continue
    const unit = moneyNumber(line.unit_price_snapshot)
    const qty = Number(line.quantity) || 0
    lineTotalByOrder.set(
      orderId,
      roundMoney((lineTotalByOrder.get(orderId) ?? 0) + unit * qty)
    )
  }

  const sellerNameById = new Map<string, string>()
  for (const seller of sellers) {
    const company = seller.company as { legal_name?: string } | undefined
    const name = company?.legal_name?.trim()
    sellerNameById.set(seller.id, name || seller.id)
  }

  const companyIds = [
    ...new Set(
      affiliates
        .map((row) => row.company_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const companies =
    companyIds.length > 0
      ? await partner.listCompanies({ id: companyIds }, { take: 500 })
      : []
  const companyNameById = new Map<string, string>()
  for (const company of companies) {
    const name = company.legal_name?.trim()
    if (name) companyNameById.set(company.id, name)
  }

  const affiliateNameById = new Map<string, string>()
  const affiliateStatusById = new Map<string, string>()
  for (const row of affiliates) {
    affiliateNameById.set(
      row.id,
      (row.company_id && companyNameById.get(row.company_id)) || row.id
    )
    affiliateStatusById.set(row.id, String(row.onboarding_status))
  }

  return {
    commissions,
    payouts,
    invoices,
    orders,
    lineTotalByOrder,
    sellerNameById,
    affiliateNameById,
    affiliateStatusById,
  }
}

function orderIndex(snapshot: LoadedFinance) {
  const byId = new Map(snapshot.orders.map((o) => [o.id, o]))
  return byId
}

export function buildFinanceTransactions(
  snapshot: LoadedFinance
): FinanceTxnRow[] {
  const orders = orderIndex(snapshot)
  const rows: FinanceTxnRow[] = []
  const payoutByOrderSeller = new Map<string, LoadedFinance["payouts"][number]>()

  for (const p of snapshot.payouts) {
    if (p.order_id && p.recipient_type === "Seller") {
      payoutByOrderSeller.set(p.order_id, p)
    }
  }

  for (const c of snapshot.commissions) {
    const order = c.order_id ? orders.get(c.order_id) : undefined
    const isAffiliate = c.recipient_type === "Affiliate"
    const relatedPayout = isAffiliate
      ? c.order_id
        ? [...snapshot.payouts].find(
            (p) =>
              p.order_id === c.order_id &&
              p.recipient_type === "Affiliate"
          )
        : undefined
      : c.order_id
        ? payoutByOrderSeller.get(c.order_id)
        : undefined
    const sellerId = order?.seller_id ?? null
    rows.push({
      id: c.id,
      source: "commission",
      type: isAffiliate ? "affiliate_commission" : "platform_commission",
      created_at: asIso(c.created_at) ?? "",
      order_id: c.order_id,
      order_number: order?.order_number ?? null,
      party_type: isAffiliate ? "affiliate" : "platform",
      party_id: isAffiliate
        ? relatedPayout?.affiliate_id ?? null
        : sellerId,
      party_name: isAffiliate
        ? relatedPayout?.affiliate_id
          ? snapshot.affiliateNameById.get(relatedPayout.affiliate_id) ??
            relatedPayout.affiliate_id
          : null
        : sellerId
          ? snapshot.sellerNameById.get(sellerId) ?? sellerId
          : "Platform",
      amount: moneyNumber(c.amount),
      currency: "EUR",
      status: c.status,
      commission_amount: moneyNumber(c.amount),
      payout_status: relatedPayout?.status ?? null,
      eligible_at: relatedPayout ? asIso(relatedPayout.eligible_at) : null,
      processed_at: relatedPayout ? asIso(relatedPayout.processed_at) : null,
      reference: c.conversion_id,
    })
  }

  for (const p of snapshot.payouts) {
    const order = p.order_id ? orders.get(p.order_id) : undefined
    const isAffiliate = p.recipient_type === "Affiliate"
    const relatedCommission = snapshot.commissions.find((c) => {
      if (c.order_id !== p.order_id) return false
      return isAffiliate
        ? c.recipient_type === "Affiliate"
        : c.recipient_type === "Platform"
    })
    rows.push({
      id: p.id,
      source: "payout",
      type: isAffiliate ? "affiliate_payout" : "seller_payout",
      created_at: asIso(p.created_at) ?? "",
      order_id: p.order_id,
      order_number: order?.order_number ?? null,
      party_type: isAffiliate ? "affiliate" : "seller",
      party_id: isAffiliate ? p.affiliate_id : p.seller_id,
      party_name: isAffiliate
        ? p.affiliate_id
          ? snapshot.affiliateNameById.get(p.affiliate_id) ?? p.affiliate_id
          : null
        : p.seller_id
          ? snapshot.sellerNameById.get(p.seller_id) ?? p.seller_id
          : null,
      amount: moneyNumber(p.amount),
      currency: p.currency || "EUR",
      status: p.status,
      commission_amount: relatedCommission
        ? moneyNumber(relatedCommission.amount)
        : null,
      payout_status: p.status,
      eligible_at: asIso(p.eligible_at),
      processed_at: asIso(p.processed_at),
      reference: p.stripe_transfer_id ?? p.period,
    })
  }

  for (const inv of snapshot.invoices) {
    if (!inv.credit_of_invoice_id) continue
    const order = inv.order_id ? orders.get(inv.order_id) : undefined
    rows.push({
      id: inv.id,
      source: "invoice",
      type: "refund",
      created_at: asIso(inv.issued_at) ?? "",
      order_id: inv.order_id,
      order_number: order?.order_number ?? null,
      party_type: "customer",
      party_id: inv.seller_id,
      party_name: inv.seller_id
        ? snapshot.sellerNameById.get(inv.seller_id) ?? inv.seller_id
        : null,
      amount: moneyNumber(inv.total_amount),
      currency: "EUR",
      status: "Teruggedraaid",
      commission_amount: null,
      payout_status: null,
      eligible_at: null,
      processed_at: asIso(inv.issued_at),
      reference: inv.credit_of_invoice_id,
    })
  }

  rows.sort((a, b) => asTime(b.created_at) - asTime(a.created_at))
  return rows
}

export function filterFinanceTransactions(
  rows: FinanceTxnRow[],
  opts: {
    range: FinancePeriodRange
    q?: string | null
    type?: string | null
    status?: string | null
    seller_id?: string | null
    affiliate_id?: string | null
  }
): FinanceTxnRow[] {
  const q = opts.q?.toLowerCase() ?? ""
  return rows.filter((row) => {
    if (!isInFinancePeriod(row.created_at, opts.range)) return false
    if (opts.type && row.type !== opts.type) return false
    if (opts.status && row.status !== opts.status) return false
    if (opts.seller_id) {
      const sellerMatch =
        (row.party_type === "seller" && row.party_id === opts.seller_id) ||
        (row.party_type === "platform" && row.party_id === opts.seller_id)
      if (!sellerMatch) return false
    }
    if (opts.affiliate_id) {
      if (!(row.party_type === "affiliate" && row.party_id === opts.affiliate_id)) {
        return false
      }
    }
    if (q) {
      const hay = [
        row.id,
        row.order_id,
        row.order_number,
        row.party_id,
        row.party_name,
        row.reference,
        row.type,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function buildFinanceOverview(
  snapshot: LoadedFinance,
  range: FinancePeriodRange
) {
  const ordersInPeriod = snapshot.orders.filter((o) =>
    isInFinancePeriod(o.created_at, range)
  )
  let revenue = 0
  for (const order of ordersInPeriod) {
    revenue += snapshot.lineTotalByOrder.get(order.id) ?? 0
  }

  const commissionsInPeriod = snapshot.commissions.filter((c) =>
    isInFinancePeriod(c.created_at, range)
  )
  const payoutsInPeriod = snapshot.payouts.filter((p) =>
    isInFinancePeriod(p.created_at, range)
  )
  const refundsInPeriod = snapshot.invoices.filter(
    (inv) => inv.credit_of_invoice_id && isInFinancePeriod(inv.issued_at, range)
  )

  const platformAwarded = commissionsInPeriod
    .filter((c) => c.recipient_type === "Platform" && c.status === "Toegekend")
    .reduce((s, c) => s + moneyNumber(c.amount), 0)
  const platformReversed = snapshot.commissions
    .filter(
      (c) =>
        c.recipient_type === "Platform" &&
        c.status === "Teruggedraaid" &&
        isInFinancePeriod(c.created_at, range)
    )
    .length
  const affiliateAwarded = commissionsInPeriod
    .filter((c) => c.recipient_type === "Affiliate" && c.status === "Toegekend")
    .reduce((s, c) => s + moneyNumber(c.amount), 0)
  const affiliateReversed = commissionsInPeriod
    .filter((c) => c.recipient_type === "Affiliate" && c.status === "Teruggedraaid")
    .reduce((s, c) => s + moneyNumber(c.amount), 0)

  const sellerPayouts = snapshot.payouts.filter((p) => p.recipient_type === "Seller")
  const sellerAmount = payoutsInPeriod
    .filter((p) => p.recipient_type === "Seller" && p.status !== "Geannuleerd")
    .reduce((s, p) => s + moneyNumber(p.amount), 0)

  const openPayouts = snapshot.payouts.filter((p) => p.status === "Gepland")
  const processingPayouts = snapshot.payouts.filter(
    (p) => p.status === "In behandeling"
  )
  const paidPayouts = snapshot.payouts.filter((p) => {
    if (p.status !== "Voltooid") return false
    return isInFinancePeriod(p.processed_at ?? p.created_at, range)
  })
  const cancelledPayouts = snapshot.payouts.filter(
    (p) => p.status === "Geannuleerd" && isInFinancePeriod(p.created_at, range)
  )

  const txnCount =
    commissionsInPeriod.length + payoutsInPeriod.length + refundsInPeriod.length

  return {
    period: {
      key: range.key,
      label: range.label,
      from: range.from ? range.from.toISOString() : null,
      to: range.to.toISOString(),
    },
    kpis: {
      revenue: roundMoney(revenue),
      platform_commission: roundMoney(platformAwarded),
      seller_amount: roundMoney(sellerAmount),
      affiliate_commission: roundMoney(affiliateAwarded),
      payouts_scheduled: roundMoney(
        openPayouts.reduce((s, p) => s + moneyNumber(p.amount), 0)
      ),
      payouts_processing: roundMoney(
        processingPayouts.reduce((s, p) => s + moneyNumber(p.amount), 0)
      ),
      payouts_paid: roundMoney(
        paidPayouts.reduce((s, p) => s + moneyNumber(p.amount), 0)
      ),
      reversed: roundMoney(
        cancelledPayouts.reduce((s, p) => s + moneyNumber(p.amount), 0) +
          affiliateReversed
      ),
      transaction_count: txnCount,
      open_payout_count: openPayouts.length,
      processing_payout_count: processingPayouts.length,
      paid_payout_count: paidPayouts.length,
      reversed_commission_count:
        platformReversed +
        commissionsInPeriod.filter(
          (c) => c.recipient_type === "Affiliate" && c.status === "Teruggedraaid"
        ).length,
      order_count: ordersInPeriod.length,
    },
    notes: {
      revenue: "Som orderregel-snapshots (zelfde grondslag als platformcommissie 10%).",
      platform_commission: "Commission recipient_type Platform, status Toegekend.",
      seller_amount: "Seller-payouts in de periode, niet geannuleerd (netto na 10%).",
      affiliate_commission: "Commission recipient_type Affiliate, status Toegekend.",
      payouts_scheduled: "Alle payouts status Gepland (hold tot eligible_at).",
      payouts_processing: "Alle payouts status In behandeling.",
      payouts_paid: "Payouts Voltooid in de periode (processed_at of created_at).",
      reversed: "Geannuleerde payouts + teruggedraaide affiliate-commissies in de periode.",
    },
  }
}

export function buildSellerFinanceRows(
  snapshot: LoadedFinance,
  range: FinancePeriodRange
) {
  const sellerIds = new Set<string>()
  for (const o of snapshot.orders) sellerIds.add(o.seller_id)
  for (const p of snapshot.payouts) {
    if (p.seller_id) sellerIds.add(p.seller_id)
  }

  const rows = []
  for (const sellerId of sellerIds) {
    const sellerOrders = snapshot.orders.filter((o) => o.seller_id === sellerId)
    const ordersInPeriod = sellerOrders.filter((o) =>
      isInFinancePeriod(o.created_at, range)
    )
    let revenue = 0
    for (const o of ordersInPeriod) {
      revenue += snapshot.lineTotalByOrder.get(o.id) ?? 0
    }
    const orderIds = new Set(sellerOrders.map((o) => o.id))
    const platformCommission = snapshot.commissions
      .filter(
        (c) =>
          c.recipient_type === "Platform" &&
          c.status === "Toegekend" &&
          c.order_id &&
          orderIds.has(c.order_id) &&
          isInFinancePeriod(c.created_at, range)
      )
      .reduce((s, c) => s + moneyNumber(c.amount), 0)
    const sellerPayouts = snapshot.payouts.filter((p) => p.seller_id === sellerId)
    const open = sellerPayouts
      .filter((p) => OPEN_PAYOUT_STATUSES.has(p.status))
      .reduce((s, p) => s + moneyNumber(p.amount), 0)
    const paid = sellerPayouts
      .filter((p) => p.status === "Voltooid")
      .reduce((s, p) => s + moneyNumber(p.amount), 0)
    const reversed = sellerPayouts
      .filter((p) => p.status === "Geannuleerd")
      .reduce((s, p) => s + moneyNumber(p.amount), 0)
    const netInPeriod = sellerPayouts
      .filter(
        (p) =>
          p.status !== "Geannuleerd" && isInFinancePeriod(p.created_at, range)
      )
      .reduce((s, p) => s + moneyNumber(p.amount), 0)
    const lastActivity = [
      ...sellerOrders.map((o) => asTime(o.created_at)),
      ...sellerPayouts.map((p) => asTime(p.created_at)),
    ]
      .filter(Boolean)
      .sort((a, b) => b - a)[0]

    rows.push({
      seller_id: sellerId,
      seller_name: snapshot.sellerNameById.get(sellerId) ?? sellerId,
      revenue: roundMoney(revenue),
      platform_commission: roundMoney(platformCommission),
      seller_amount: roundMoney(netInPeriod),
      payout_open: roundMoney(open),
      payout_paid: roundMoney(paid),
      payout_reversed: roundMoney(reversed),
      order_count: ordersInPeriod.length,
      last_activity_at: lastActivity ? new Date(lastActivity).toISOString() : null,
    })
  }

  rows.sort((a, b) => b.revenue - a.revenue)
  return rows
}

export function buildAffiliateFinanceRows(
  snapshot: LoadedFinance,
  range: FinancePeriodRange
) {
  const ids = new Set<string>()
  for (const p of snapshot.payouts) {
    if (p.affiliate_id) ids.add(p.affiliate_id)
  }
  for (const id of snapshot.affiliateNameById.keys()) ids.add(id)

  const orderById = orderIndex(snapshot)
  const rows = []
  for (const affiliateId of ids) {
    const payouts = snapshot.payouts.filter((p) => p.affiliate_id === affiliateId)
    const orderIds = new Set(
      payouts.map((p) => p.order_id).filter((id): id is string => Boolean(id))
    )
    const commissions = snapshot.commissions.filter(
      (c) =>
        c.recipient_type === "Affiliate" &&
        c.order_id &&
        orderIds.has(c.order_id)
    )
    const commissionsInPeriod = commissions.filter((c) =>
      isInFinancePeriod(c.created_at, range)
    )
    let revenue = 0
    for (const orderId of orderIds) {
      const order = orderById.get(orderId)
      if (!order || !isInFinancePeriod(order.created_at, range)) continue
      revenue += snapshot.lineTotalByOrder.get(orderId) ?? 0
    }
    const awarded = commissionsInPeriod
      .filter((c) => c.status === "Toegekend")
      .reduce((s, c) => s + moneyNumber(c.amount), 0)
    const reversedComm = commissionsInPeriod
      .filter((c) => c.status === "Teruggedraaid")
      .reduce((s, c) => s + moneyNumber(c.amount), 0)
    const open = payouts
      .filter((p) => OPEN_PAYOUT_STATUSES.has(p.status))
      .reduce((s, p) => s + moneyNumber(p.amount), 0)
    const paid = payouts
      .filter((p) => p.status === "Voltooid")
      .reduce((s, p) => s + moneyNumber(p.amount), 0)
    const cancelled = payouts
      .filter((p) => p.status === "Geannuleerd")
      .reduce((s, p) => s + moneyNumber(p.amount), 0)
    const payoutInPeriod = payouts
      .filter((p) => isInFinancePeriod(p.created_at, range))
      .reduce((s, p) => s + moneyNumber(p.amount), 0)

    rows.push({
      affiliate_id: affiliateId,
      affiliate_name: snapshot.affiliateNameById.get(affiliateId) ?? affiliateId,
      status: snapshot.affiliateStatusById.get(affiliateId) ?? null,
      revenue: roundMoney(revenue),
      commission: roundMoney(awarded),
      commission_open: roundMoney(open),
      payout: roundMoney(payoutInPeriod),
      payout_paid: roundMoney(paid),
      payout_reversed: roundMoney(cancelled + reversedComm),
    })
  }

  rows.sort((a, b) => b.commission - a.commission)
  return rows
}

export function serializePayout(
  snapshot: LoadedFinance,
  payout: LoadedFinance["payouts"][number]
) {
  const order = payout.order_id
    ? snapshot.orders.find((o) => o.id === payout.order_id)
    : undefined
  const relatedCommissions = snapshot.commissions.filter(
    (c) => c.order_id && c.order_id === payout.order_id
  )
  return {
    id: payout.id,
    recipient_type: payout.recipient_type,
    seller_id: payout.seller_id,
    seller_name: payout.seller_id
      ? snapshot.sellerNameById.get(payout.seller_id) ?? payout.seller_id
      : null,
    affiliate_id: payout.affiliate_id,
    affiliate_name: payout.affiliate_id
      ? snapshot.affiliateNameById.get(payout.affiliate_id) ?? payout.affiliate_id
      : null,
    amount: moneyNumber(payout.amount),
    currency: payout.currency || "EUR",
    status: payout.status,
    period: payout.period,
    eligible_at: asIso(payout.eligible_at),
    processed_at: asIso(payout.processed_at),
    created_at: asIso(payout.created_at),
    order_id: payout.order_id,
    order_number: order?.order_number ?? null,
    stripe_transfer_id: payout.stripe_transfer_id,
    process_available: false,
    process_note:
      "POST /admin/finance/payouts/:id/process bestaat, maar de Stripe Connect-transfer is een stub (ADR-0018). Geen verwerkingsactie in de UI.",
    commissions: relatedCommissions.map((c) => ({
      id: c.id,
      recipient_type: c.recipient_type,
      amount: moneyNumber(c.amount),
      percentage: Number(c.percentage) || 0,
      status: c.status,
    })),
  }
}

export { moneyNumber, asIso }
