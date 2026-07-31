import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { FINANCE_MODULE } from "../../modules/finance"
import type FinanceModuleService from "../../modules/finance/service"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"
import { AFFILIATE_MODULE } from "../../modules/affiliate"
import type AffiliateModuleService from "../../modules/affiliate/service"

/** H5.6 — vast platformpercentage over orderregel-snapshots (base+shipping). */
export const PLATFORM_COMMISSION_RATE = 0.1

/** EU MVP retourhold (ADR-0034). */
export const RETURN_HOLD_DAYS = 14

export type VatBreakdownLine = {
  rate: number
  base_incl: number
  amount_excl: number
  vat_amount: number
}

export type VatBreakdown = {
  currency: string
  lines: VatBreakdownLine[]
  totals: {
    amount_excl: number
    vat_amount: number
    total_incl: number
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** Prijzen zijn incl. BTW (checkout/totals-patroon). */
export function buildVatBreakdownFromIncl(
  items: Array<{ amount_incl: number; vat_rate: number }>
): VatBreakdown {
  const byRate = new Map<number, number>()
  for (const item of items) {
    const prev = byRate.get(item.vat_rate) ?? 0
    byRate.set(item.vat_rate, prev + item.amount_incl)
  }

  const lines: VatBreakdownLine[] = []
  let amount_excl = 0
  let vat_amount = 0
  let total_incl = 0

  for (const [rate, base_incl] of byRate) {
    const vat = roundMoney(base_incl * (rate / (1 + rate)))
    const excl = roundMoney(base_incl - vat)
    lines.push({
      rate,
      base_incl: roundMoney(base_incl),
      amount_excl: excl,
      vat_amount: vat,
    })
    amount_excl = roundMoney(amount_excl + excl)
    vat_amount = roundMoney(vat_amount + vat)
    total_incl = roundMoney(total_incl + base_incl)
  }

  return {
    currency: "EUR",
    lines,
    totals: { amount_excl, vat_amount, total_incl },
  }
}

async function orderGoodsSubtotal(
  orders: OrderServiceModuleService,
  orderId: string
): Promise<{
  subtotal: number
  vatItems: Array<{ amount_incl: number; vat_rate: number }>
  sellerId: string
  createdAt: Date
}> {
  const order = await orders.retrieveEmOrder(orderId)
  const lines = await orders.listOrderLines({ order_id: orderId })
  let subtotal = 0
  const vatItems: Array<{ amount_incl: number; vat_rate: number }> = []
  for (const line of lines) {
    const amount_incl =
      Number(line.unit_price_snapshot) * Number(line.quantity)
    subtotal += amount_incl
    vatItems.push({
      amount_incl,
      vat_rate: Number(line.vat_rate_snapshot),
    })
  }
  return {
    subtotal: roundMoney(subtotal),
    vatItems,
    sellerId: order.seller_id,
    createdAt: new Date(order.created_at),
  }
}

/**
 * S3-08-02/03/04 — Platformcommissie, facturen en Seller-payout bij OrderSplit.
 */
export async function executeFinanceOnOrderSplit(
  container: MedusaContainer,
  orderId: string
) {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const existingPlatform = await finance.listCommissions({
    order_id: orderId,
    recipient_type: "Platform",
    status: "Toegekend",
  })
  if (existingPlatform[0]) {
    return {
      skipped: true as const,
      commission_id: existingPlatform[0].id,
    }
  }

  const { subtotal, vatItems, sellerId, createdAt } =
    await orderGoodsSubtotal(orders, orderId)

  const platformAmount = roundMoney(subtotal * PLATFORM_COMMISSION_RATE)
  const commission = await finance.createCommissions({
    recipient_type: "Platform",
    order_id: orderId,
    conversion_id: null,
    amount: platformAmount,
    percentage: PLATFORM_COMMISSION_RATE,
    status: "Toegekend",
  })

  await eventBus.emit({
    name: "CommissionCalculated",
    data: {
      commission_id: commission.id,
      order_id: orderId,
      seller_id: sellerId,
      recipient_type: "Platform",
      amount: platformAmount,
      percentage: PLATFORM_COMMISSION_RATE,
    },
  })

  const vat_breakdown = buildVatBreakdownFromIncl(vatItems)
  const issuedAt = new Date()

  const customerInvoice = await finance.createInvoices({
    invoice_type: "Klant-factuur",
    order_id: orderId,
    seller_id: sellerId,
    vat_breakdown,
    amount_excl_vat: vat_breakdown.totals.amount_excl,
    total_amount: vat_breakdown.totals.total_incl,
    pdf_url: null,
    issued_at: issuedAt,
    credit_of_invoice_id: null,
    period: null,
  })

  await eventBus.emit({
    name: "InvoiceIssued",
    data: {
      invoice_id: customerInvoice.id,
      invoice_type: "Klant-factuur",
      order_id: orderId,
      seller_id: sellerId,
    },
  })

  const commissionVat = buildVatBreakdownFromIncl([
    { amount_incl: platformAmount, vat_rate: 0.21 },
  ])
  const sellerCommissionInvoice = await finance.createInvoices({
    invoice_type: "Seller-commissiefactuur",
    order_id: orderId,
    seller_id: sellerId,
    vat_breakdown: commissionVat,
    amount_excl_vat: commissionVat.totals.amount_excl,
    total_amount: commissionVat.totals.total_incl,
    pdf_url: null,
    issued_at: issuedAt,
    credit_of_invoice_id: null,
    period: `order:${orderId}`,
  })

  await eventBus.emit({
    name: "InvoiceIssued",
    data: {
      invoice_id: sellerCommissionInvoice.id,
      invoice_type: "Seller-commissiefactuur",
      order_id: orderId,
      seller_id: sellerId,
      period: `order:${orderId}`,
    },
  })

  const netPayout = roundMoney(subtotal - platformAmount)
  const eligibleAt = addDays(createdAt, RETURN_HOLD_DAYS)
  const payout = await finance.createPayouts({
    recipient_type: "Seller",
    seller_id: sellerId,
    affiliate_id: null,
    amount: netPayout,
    period: `order:${orderId}`,
    status: "Gepland",
    currency: "EUR",
    eligible_at: eligibleAt,
    processed_at: null,
    stripe_transfer_id: null,
    order_id: orderId,
  })

  return {
    skipped: false as const,
    commission_id: commission.id,
    customer_invoice_id: customerInvoice.id,
    seller_commission_invoice_id: sellerCommissionInvoice.id,
    payout_id: payout.id,
    platform_amount: platformAmount,
    net_payout: netPayout,
    eligible_at: eligibleAt.toISOString(),
  }
}

/**
 * S3-08-04 — Affiliate-payout ledgerregel na CommissionCalculated (Affiliate).
 */
export async function executeScheduleAffiliatePayout(
  container: MedusaContainer,
  input: {
    order_id: string
    affiliate_id: string
    amount: number
  }
) {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService

  const existing = await finance.listPayouts({
    order_id: input.order_id,
    recipient_type: "Affiliate",
    affiliate_id: input.affiliate_id,
  })
  if (existing[0]) {
    return { payout_id: existing[0].id, skipped: true as const }
  }

  const order = await orders.retrieveEmOrder(input.order_id)
  const eligibleAt = addDays(new Date(order.created_at), RETURN_HOLD_DAYS)
  const payout = await finance.createPayouts({
    recipient_type: "Affiliate",
    seller_id: null,
    affiliate_id: input.affiliate_id,
    amount: roundMoney(input.amount),
    period: `order:${input.order_id}`,
    status: "Gepland",
    currency: "EUR",
    eligible_at: eligibleAt,
    processed_at: null,
    stripe_transfer_id: null,
    order_id: input.order_id,
  })

  return { payout_id: payout.id, skipped: false as const }
}

/**
 * S3-08-03 — creditnota + reverse Platform-commissie + annuleer Gepland-payouts.
 */
export async function executeFinanceRefundForOrder(
  container: MedusaContainer,
  orderId: string
) {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const platformCommissions = await finance.listCommissions({
    order_id: orderId,
    recipient_type: "Platform",
    status: "Toegekend",
  })
  for (const c of platformCommissions) {
    await finance.updateCommissions({
      id: c.id,
      status: "Teruggedraaid",
      amount: 0,
    })
  }

  const customerInvoices = await finance.listInvoices({
    order_id: orderId,
    invoice_type: "Klant-factuur",
  })
  const originals = customerInvoices.filter((inv) => !inv.credit_of_invoice_id)
  const creditIds: string[] = []

  for (const original of originals) {
    const already = customerInvoices.find(
      (inv) => inv.credit_of_invoice_id === original.id
    )
    if (already) continue

    const originalBreakdown = original.vat_breakdown as VatBreakdown
    const negative: VatBreakdown = {
      currency: originalBreakdown.currency ?? "EUR",
      lines: (originalBreakdown.lines ?? []).map((line) => ({
        rate: line.rate,
        base_incl: roundMoney(-Math.abs(line.base_incl)),
        amount_excl: roundMoney(-Math.abs(line.amount_excl)),
        vat_amount: roundMoney(-Math.abs(line.vat_amount)),
      })),
      totals: {
        amount_excl: roundMoney(
          -Math.abs(originalBreakdown.totals?.amount_excl ?? 0)
        ),
        vat_amount: roundMoney(
          -Math.abs(originalBreakdown.totals?.vat_amount ?? 0)
        ),
        total_incl: roundMoney(
          -Math.abs(originalBreakdown.totals?.total_incl ?? 0)
        ),
      },
    }

    const credit = await finance.createInvoices({
      invoice_type: "Klant-factuur",
      order_id: orderId,
      seller_id: original.seller_id,
      vat_breakdown: negative,
      amount_excl_vat: negative.totals.amount_excl,
      total_amount: negative.totals.total_incl,
      pdf_url: null,
      issued_at: new Date(),
      credit_of_invoice_id: original.id,
      period: null,
    })
    creditIds.push(credit.id)

    await eventBus.emit({
      name: "InvoiceIssued",
      data: {
        invoice_id: credit.id,
        invoice_type: "Klant-factuur",
        order_id: orderId,
        seller_id: original.seller_id,
        credit_of_invoice_id: original.id,
        is_credit_note: true,
      },
    })
  }

  const payouts = await finance.listPayouts({
    order_id: orderId,
    status: "Gepland",
  })
  for (const p of payouts) {
    await finance.updatePayouts({
      id: p.id,
      status: "Geannuleerd",
    })
  }

  return {
    platform_reversed: platformCommissions.length,
    credit_invoice_ids: creditIds,
    payouts_cancelled: payouts.length,
  }
}

/**
 * S3-08-04 — verwerk payout alleen na eligible_at (Connect-transfer stub).
 */
export async function executeProcessPayout(
  container: MedusaContainer,
  payoutId: string
) {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const payout = await finance.retrievePayout(payoutId)
  if (payout.status === "Voltooid") {
    return { payout_id: payout.id, already_processed: true as const }
  }
  if (payout.status === "Geannuleerd") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geannuleerde payout kan niet worden verwerkt."
    )
  }
  if (new Date(payout.eligible_at).getTime() > Date.now()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Uitbetaling is niet toegestaan binnen de wettelijke retourtermijn."
    )
  }

  await finance.updatePayouts({
    id: payout.id,
    status: "In behandeling",
  })

  const stubTransferId = `tr_stub_${payout.id}`
  const processedAt = new Date()
  await finance.updatePayouts({
    id: payout.id,
    status: "Voltooid",
    processed_at: processedAt,
    stripe_transfer_id: stubTransferId,
  })

  await eventBus.emit({
    name: "PayoutProcessed",
    data: {
      payout_id: payout.id,
      recipient_type: payout.recipient_type,
      seller_id: payout.seller_id,
      affiliate_id: payout.affiliate_id,
      amount: Number(payout.amount),
      order_id: payout.order_id,
      stripe_transfer_id: stubTransferId,
    },
  })

  return {
    payout_id: payout.id,
    already_processed: false as const,
    stripe_transfer_id: stubTransferId,
    processed_at: processedAt.toISOString(),
  }
}

export async function executeSellerFinanceOverview(
  container: MedusaContainer,
  customerId: string
) {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService

  const [seller] = await partner.listSellers({ customer_id: customerId })
  if (!seller || seller.onboarding_status !== "Goedgekeurd") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen goedgekeurde seller voor dit account."
    )
  }

  const commissions = await finance.listCommissions(
    { recipient_type: "Platform" },
    { take: 200, order: { created_at: "DESC" } }
  )
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const sellerOrders = await orders.listEmOrders(
    { seller_id: seller.id },
    { take: 200 }
  )
  const sellerOrderIds = new Set(sellerOrders.map((o) => o.id))
  const sellerCommissions = commissions.filter(
    (c) => c.order_id != null && sellerOrderIds.has(c.order_id)
  )

  const invoices = await finance.listInvoices(
    { seller_id: seller.id },
    { take: 200, order: { issued_at: "DESC" } }
  )
  const payouts = await finance.listPayouts(
    { seller_id: seller.id, recipient_type: "Seller" },
    { take: 200, order: { created_at: "DESC" } }
  )

  return {
    seller_id: seller.id,
    commissions: sellerCommissions.map((c) => ({
      id: c.id,
      order_id: c.order_id,
      amount: Number(c.amount),
      percentage: c.percentage,
      status: c.status,
      created_at: c.created_at,
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoice_type: inv.invoice_type,
      order_id: inv.order_id,
      total_amount: Number(inv.total_amount),
      amount_excl_vat: Number(inv.amount_excl_vat),
      vat_breakdown: inv.vat_breakdown,
      issued_at: inv.issued_at,
      credit_of_invoice_id: inv.credit_of_invoice_id,
      period: inv.period,
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      period: p.period,
      status: p.status,
      eligible_at: p.eligible_at,
      processed_at: p.processed_at,
      order_id: p.order_id,
      stripe_transfer_id: p.stripe_transfer_id,
    })),
  }
}

export async function executeAffiliateFinancePayouts(
  container: MedusaContainer,
  customerId: string
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService

  const [affiliate] = await aff.listAffiliates({ customer_id: customerId })
  if (!affiliate || affiliate.onboarding_status !== "Goedgekeurd") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen goedgekeurde affiliate voor dit account."
    )
  }

  const payouts = await finance.listPayouts(
    { affiliate_id: affiliate.id, recipient_type: "Affiliate" },
    { take: 200, order: { created_at: "DESC" } }
  )

  return {
    affiliate_id: affiliate.id,
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      period: p.period,
      status: p.status,
      eligible_at: p.eligible_at,
      processed_at: p.processed_at,
      order_id: p.order_id,
      stripe_transfer_id: p.stripe_transfer_id,
    })),
  }
}

export async function executeListAdminPayouts(
  container: MedusaContainer,
  filters?: { status?: string; recipient_type?: string }
) {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const query: Record<string, string> = {}
  if (filters?.status) query.status = filters.status
  if (filters?.recipient_type) query.recipient_type = filters.recipient_type

  const payouts = await finance.listPayouts(query, {
    take: 200,
    order: { created_at: "DESC" },
  })

  return {
    payouts: payouts.map((p) => ({
      id: p.id,
      recipient_type: p.recipient_type,
      seller_id: p.seller_id,
      affiliate_id: p.affiliate_id,
      amount: Number(p.amount),
      currency: p.currency,
      period: p.period,
      status: p.status,
      eligible_at: p.eligible_at,
      processed_at: p.processed_at,
      order_id: p.order_id,
      stripe_transfer_id: p.stripe_transfer_id,
    })),
  }
}

const financeOnSplitStep = createStep(
  "finance-on-order-split",
  async (input: { order_id: string }, { container }) => {
    return new StepResponse(
      await executeFinanceOnOrderSplit(container, input.order_id)
    )
  }
)

export const financeOnOrderSplitWorkflow = createWorkflow(
  "finance-on-order-split",
  (input: { order_id: string }) => {
    return new WorkflowResponse(financeOnSplitStep(input))
  }
)

const processPayoutStep = createStep(
  "process-payout",
  async (input: { payout_id: string }, { container }) => {
    return new StepResponse(
      await executeProcessPayout(container, input.payout_id)
    )
  }
)

export const processPayoutWorkflow = createWorkflow(
  "process-payout",
  (input: { payout_id: string }) => {
    return new WorkflowResponse(processPayoutStep(input))
  }
)
