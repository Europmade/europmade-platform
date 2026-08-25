/**
 * G3 — Period close: settlement snapshot + EuropMade dienstenfactuur.
 * Hergebruikt bestaande orders, commissions, refunds en ad_campaign_week.
 * Geen payout, geen hold-wijziging, geen affiliate op de seller-factuur.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { FINANCE_MODULE } from "../../modules/finance"
import type FinanceModuleService from "../../modules/finance/service"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"
import { CMS_MODULE } from "../../modules/cms"
import type CmsModuleService from "../../modules/cms/service"
import {
  getNextInvoiceNumber,
  determineVatRegime,
  type InvoiceLineInput,
} from "./seller-invoicing"
import {
  computeNetSettlement,
  serializeSellerSettlement,
} from "../../modules/finance/serialize-settlement"

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function inRange(iso: Date | string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function samePeriod(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date,
  bEnd: Date
): boolean {
  return (
    new Date(aStart).getTime() === bStart.getTime() &&
    new Date(aEnd).getTime() === bEnd.getTime()
  )
}

function getIsoWeek(date: Date): number {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const PROCESSED_REFUND = new Set(["processed", "forced"])

const FISCAL_SNAPSHOT_NOTES = {
  vat_regime_source:
    "Bestaande determineVatRegime-configuratie (nog geen fiscale goedkeuring).",
  goods_vat:
    "Verkoopbasis = bestaande order_line.unit_price_snapshot; geen nieuwe BTW-interpretatie.",
  deemed_supplier: "Niet in G3. Seller verkoopt aan consument.",
  late_returns:
    "Refunds via refund_executed_at in deze periode. Retour ná close valt in een latere close; geen heropening.",
  affiliate: "Affiliatecommissie is geen seller-kost; niet op deze factuur.",
  payout: "G3 maakt geen payout. payout_id blijft leeg tot G5.",
  pdf: "Geen fiscale PDF-layout in G3; HTML/detail alleen.",
}

async function findExistingSettlement(
  finance: FinanceModuleService,
  sellerId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const rows = await finance.listSellerSettlements(
    { seller_id: sellerId },
    { take: 200, order: { period_start: "DESC" } }
  )
  return (
    rows.find((row) =>
      samePeriod(row.period_start, row.period_end, periodStart, periodEnd)
    ) ?? null
  )
}

async function collectAdvertising(
  container: MedusaContainer,
  sellerId: string,
  periodStart: Date,
  periodEnd: Date,
  vatRate: number
): Promise<{
  lines: InvoiceLineInput[]
  advertisingAmount: number
  bannerAmount: number
}> {
  const lines: InvoiceLineInput[] = []
  let advertisingAmount = 0
  let bannerAmount = 0
  let cms: CmsModuleService | null = null
  try {
    cms = container.resolve(CMS_MODULE) as CmsModuleService
  } catch {
    return { lines, advertisingAmount, bannerAmount }
  }
  try {
    const campaigns = await (cms as any).listAdCampaigns(
      { seller_id: sellerId },
      { take: 1000 }
    )
    for (const camp of campaigns) {
      if (camp.status === "draft") continue
      const weeks = await (cms as any).listAdCampaignWeeks(
        { campaign_id: camp.id },
        { take: 200 }
      )
      const periodWeeks = weeks.filter((w: any) => {
        const ws = new Date(w.week_start)
        return ws >= periodStart && ws <= periodEnd
      })
      if (periodWeeks.length === 0) continue

      const totalPrice = roundMoney(
        periodWeeks.reduce((sum: number, w: any) => sum + Number(w.week_price), 0)
      )
      advertisingAmount = roundMoney(advertisingAmount + totalPrice)
      const isBanner = String(camp.placement || "")
        .toLowerCase()
        .includes("banner")
      if (isBanner) {
        bannerAmount = roundMoney(bannerAmount + totalPrice)
      }

      const lineVat = roundMoney(totalPrice * vatRate)
      const weekLabels = periodWeeks
        .map((w: any) => {
          const d = new Date(w.week_start)
          return `wk${getIsoWeek(d)}`
        })
        .join(", ")

      lines.push({
        line_type: "advertising",
        description: `${camp.name} — ${camp.placement} ${(camp.markets as string[])?.join(", ") ?? ""} (${weekLabels})`,
        source_ref: camp.id,
        source_type: "campaign",
        quantity: periodWeeks.length,
        unit_price:
          periodWeeks.length > 0
            ? roundMoney(totalPrice / periodWeeks.length)
            : 0,
        commission_pct: null,
        net_amount: totalPrice,
        vat_rate: vatRate,
        vat_amount: lineVat,
        gross_amount: roundMoney(totalPrice + lineVat),
      })
    }
  } catch {
    // Ad listing failed — skip ads, keep sales/commission
  }
  return { lines, advertisingAmount, bannerAmount }
}

/**
 * Close one seller calendar period: immutable settlement + optional dienstenfactuur.
 * Idempotent on seller + period.
 */
export async function closeSellerFinancePeriod(
  container: MedusaContainer,
  sellerId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService

  const existing = await findExistingSettlement(
    finance,
    sellerId,
    periodStart,
    periodEnd
  )
  if (existing && existing.status === "closed") {
    return {
      skipped: false,
      idempotent: true,
      settlement_id: existing.id,
      invoice_id: existing.invoice_id,
      settlement: serializeSellerSettlement(existing),
    }
  }

  const seller = await partner.retrieveSeller(sellerId)
  let company: any = null
  if (seller.company_id) {
    try {
      company = await partner.retrieveCompany(seller.company_id)
    } catch {
      company = null
    }
  }

  const { regime, rate: vatRate, reverseChargeNote } = determineVatRegime(
    company?.country_code,
    company?.vat_number
  )

  const sellerOrders = await orders.listEmOrders(
    { seller_id: sellerId },
    { take: 5000 }
  )
  const periodOrders = sellerOrders.filter((o) =>
    inRange(o.created_at, periodStart, periodEnd)
  )
  const periodOrderIds = new Set(periodOrders.map((o) => o.id))
  const allSellerOrderIds = new Set(sellerOrders.map((o) => o.id))

  let grossSales = 0
  const orderSubtotal = new Map<string, number>()
  for (const order of periodOrders) {
    const orderLines = await orders.listOrderLines({ order_id: order.id })
    const sub = roundMoney(
      orderLines.reduce(
        (sum, l) => sum + Number(l.unit_price_snapshot) * Number(l.quantity),
        0
      )
    )
    orderSubtotal.set(order.id, sub)
    grossSales = roundMoney(grossSales + sub)
  }

  let refundsTotal = 0
  try {
    const returns = await orders.listEmReturns({}, { take: 10000 })
    for (const ret of returns) {
      const executed = ret.refund_executed_at
      if (!executed || !inRange(executed, periodStart, periodEnd)) continue
      const st = String(ret.refund_status || "")
      if (!PROCESSED_REFUND.has(st)) continue
      try {
        const lineId = (ret as any).order_line_id
        if (!lineId) continue
        const [line] = await orders.listOrderLines({ id: lineId }, { take: 1 })
        if (!line) continue
        const order = await orders.retrieveEmOrder(line.order_id)
        if (order.seller_id !== sellerId) continue
        refundsTotal = roundMoney(refundsTotal + Number(ret.refund_amount ?? 0))
      } catch {
        // skip orphan return
      }
    }
  } catch {
    refundsTotal = 0
  }

  const netSales = roundMoney(Math.max(0, grossSales - refundsTotal))

  const commissions = await finance.listCommissions(
    { recipient_type: "Platform" },
    { take: 10000 }
  )
  const periodCommissions = commissions.filter(
    (c) =>
      c.order_id &&
      periodOrderIds.has(c.order_id) &&
      c.status === "Toegekend"
  )
  const reversedCommissions = commissions.filter(
    (c) =>
      c.order_id &&
      periodOrderIds.has(c.order_id) &&
      c.status === "Teruggedraaid"
  )

  const lines: InvoiceLineInput[] = []
  let platformCommission = 0
  for (const comm of periodCommissions) {
    const order = periodOrders.find((o) => o.id === comm.order_id)
    if (!order) continue
    const commAmount = Number(comm.amount)
    platformCommission = roundMoney(platformCommission + commAmount)
    const lineVat = roundMoney(commAmount * vatRate)
    lines.push({
      line_type: "commission",
      description: `Commission order ${order.order_number}`,
      source_ref: order.id,
      source_type: "order",
      quantity: 1,
      unit_price: orderSubtotal.get(order.id) ?? 0,
      commission_pct: comm.percentage,
      net_amount: commAmount,
      vat_rate: vatRate,
      vat_amount: lineVat,
      gross_amount: roundMoney(commAmount + lineVat),
    })
  }

  let creditsAmount = 0
  for (const rev of reversedCommissions) {
    const order = periodOrders.find((o) => o.id === rev.order_id)
    if (!order) continue
    const creditAmount = -Math.abs(Number(rev.amount))
    if (creditAmount === 0) continue
    creditsAmount = roundMoney(creditsAmount + creditAmount)
    const lineVat = roundMoney(creditAmount * vatRate)
    lines.push({
      line_type: "credit",
      description: `Credit commission order ${order.order_number}`,
      source_ref: order.id,
      source_type: "order",
      quantity: 1,
      unit_price: 0,
      commission_pct: rev.percentage,
      net_amount: creditAmount,
      vat_rate: vatRate,
      vat_amount: lineVat,
      gross_amount: roundMoney(creditAmount + lineVat),
    })
  }

  const ads = await collectAdvertising(
    container,
    sellerId,
    periodStart,
    periodEnd,
    vatRate
  )
  lines.push(...ads.lines)

  const otherServicesAmount = 0
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.net_amount, 0))
  const totalVat = roundMoney(lines.reduce((s, l) => s + l.vat_amount, 0))
  const invoiceTotal = lines.length
    ? roundMoney(subtotal + totalVat)
    : 0
  const amountBeforePayout = netSales
  const netSettlement = computeNetSettlement(netSales, invoiceTotal)

  const snapshot = {
    fiscal_notes: FISCAL_SNAPSHOT_NOTES,
    vat_regime: regime,
    vat_rate: vatRate,
    reverse_charge_note: reverseChargeNote,
    period_order_ids: [...periodOrderIds],
    seller_order_ids_for_refund_scope: [...allSellerOrderIds].length,
    lines: lines.map((l) => ({ ...l })),
    affiliate_excluded: true,
    payout_id: null,
  }

  let settlement = existing
  if (!settlement) {
    try {
      settlement = await finance.createSellerSettlements({
        seller_id: sellerId,
        period_start: periodStart,
        period_end: periodEnd,
        status: "closed",
        closed_at: new Date(),
        invoice_id: null,
        payout_id: null,
        currency: "EUR",
        gross_sales: grossSales,
        refunds: refundsTotal,
        net_sales: netSales,
        platform_commission: platformCommission,
        advertising_amount: ads.advertisingAmount,
        banner_amount: ads.bannerAmount,
        other_services_amount: otherServicesAmount,
        credits_amount: creditsAmount,
        invoice_total: invoiceTotal,
        amount_before_payout: amountBeforePayout,
        net_settlement: netSettlement,
        snapshot,
      })
    } catch (err: any) {
      const retry = await findExistingSettlement(
        finance,
        sellerId,
        periodStart,
        periodEnd
      )
      if (retry) {
        return {
          skipped: false,
          idempotent: true,
          settlement_id: retry.id,
          invoice_id: retry.invoice_id,
          settlement: serializeSellerSettlement(retry),
        }
      }
      throw err
    }
  }

  let invoiceId = settlement.invoice_id
  if (!invoiceId && lines.length > 0) {
    const existingInv = (
      await finance.listSellerInvoices(
        { seller_id: sellerId },
        { take: 200 }
      )
    ).find(
      (inv) =>
        samePeriod(inv.period_start, inv.period_end, periodStart, periodEnd) &&
        inv.status !== "draft" &&
        inv.status !== "cancelled"
    )
    if (existingInv) {
      invoiceId = existingInv.id
      await finance.updateSellerInvoices({
        id: existingInv.id,
        settlement_id: settlement.id,
      })
    } else {
      const invoiceNumber = await getNextInvoiceNumber(container)
      const invoiceDate = new Date()
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 30)
      const invoice = await finance.createSellerInvoices({
        seller_id: sellerId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate,
        currency: "EUR",
        subtotal,
        vat_amount: totalVat,
        total: invoiceTotal,
        vat_regime: regime,
        status: "issued",
        pdf_url: null,
        specification_url: null,
        credit_of_invoice_id: null,
        settlement_id: settlement.id,
        snapshot: {
          ...snapshot,
          europmade: {
            note: "Bedrijfsgegevens en fiscale PDF wachten op goedkeuring belastingadviseur.",
          },
          seller: {
            id: sellerId,
            company_name: company?.legal_name ?? null,
            country_code: company?.country_code ?? null,
            vat_number: company?.vat_number ?? null,
          },
          invoice_number: invoiceNumber,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          subtotal,
          vat_amount: totalVat,
          total: invoiceTotal,
        },
      })
      for (const line of lines) {
        await finance.createSellerInvoiceLines({
          invoice_id: invoice.id,
          ...line,
        })
      }
      invoiceId = invoice.id
    }
  }

  settlement = await finance.updateSellerSettlements({
    id: settlement.id,
    invoice_id: invoiceId,
    invoice_total: invoiceTotal,
    net_settlement: computeNetSettlement(netSales, invoiceTotal),
    snapshot,
    status: "closed",
    closed_at: settlement.closed_at ?? new Date(),
  })

  return {
    skipped: false,
    idempotent: false,
    settlement_id: settlement.id,
    invoice_id: invoiceId,
    settlement: serializeSellerSettlement(settlement),
    line_count: lines.length,
    vat_regime: regime,
  }
}

export async function runMonthlySellerPeriodClose(
  container: MedusaContainer,
  year: number,
  month: number
) {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const sellers = await partner.listSellers(
    { onboarding_status: "Goedgekeurd" },
    { take: 5000 }
  )
  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  const results: Array<{ seller_id: string; result: any }> = []
  for (const seller of sellers) {
    try {
      const result = await closeSellerFinancePeriod(
        container,
        seller.id,
        periodStart,
        periodEnd
      )
      results.push({ seller_id: seller.id, result })
    } catch (err: any) {
      results.push({
        seller_id: seller.id,
        result: { error: err.message },
      })
    }
  }
  return { period: `${year}-${String(month).padStart(2, "0")}`, results }
}
