import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../modules/affiliate/service"
import { FINANCE_MODULE } from "../../../../modules/finance"
import type FinanceModuleService from "../../../../modules/finance/service"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"
import { toAdminAffiliate } from "../serialize"

/** F9.1 — toegestane periodevensters (rolling days t.o.v. nu). */
export const AFFILIATE_PERFORMANCE_PERIOD_DAYS = [7, 30, 90] as const
export type AffiliatePerformancePeriodDays =
  (typeof AFFILIATE_PERFORMANCE_PERIOD_DAYS)[number]

/**
 * Conversieratio (zelfde click-based definitie als store dashboard per-link):
 * (niet-teruggedraaide conversies mét click_id in de periode) / (clicks in de periode) × 100.
 * Coupon-conversies tellen wél in conversions/orders, niet in de teller van deze ratio.
 * Geen nieuwe coupon-attributieregel.
 */
export const CONVERSION_RATE_DEFINITION =
  "click-based: (non-reversed conversions with click_id in period) / (clicks in period) * 100. Coupon conversions count in conversions/orders but not in this ratio."

const SCAN_TAKE = 10_000
const AFFILIATE_TAKE = 500
const LINK_TAKE = 2_000
const PAYOUT_TAKE = 500
const OPEN_PAYOUT_STATUSES = new Set(["Gepland", "In behandeling"])

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function roundRate(n: number): number {
  return Math.round(n * 10) / 10
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function asTime(value: Date | string | null | undefined): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

export function parsePerformancePeriodDays(
  value: unknown
): AffiliatePerformancePeriodDays {
  if (value == null || value === "") return 30
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  if ((AFFILIATE_PERFORMANCE_PERIOD_DAYS as readonly number[]).includes(n)) {
    return n as AffiliatePerformancePeriodDays
  }
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "period_days moet 7, 30 of 90 zijn."
  )
}

type ListedLink = {
  id: string
  affiliate_id?: string
  affiliate?: { id?: string }
  target_url: string
  tracking_param: string
  created_at: Date | string
}

type ListedClick = {
  id: string
  affiliate_link_id?: string
  affiliate_link?: { id?: string }
  created_at: Date | string
}

type ListedConversion = {
  id: string
  order_id: string
  click_id: string | null
  coupon_id?: string | null
  affiliate_id: string
  reversed_at: Date | string | null
  created_at: Date | string
}

type ListedCommission = {
  conversion_id: string | null
  amount: string | number
  status: string
}

type ListedPayout = {
  affiliate_id: string | null
  amount: string | number
  status: string
}

export type AffiliateLinkStat = {
  link_id: string
  target_url: string
  tracking_param: string
  display_url: string
  clicks: number
  conversions: number
  conversion_rate: number
  created_at: Date | string
}

export type AffiliatePerformanceRow = {
  affiliate_id: string
  customer_id: string
  legal_name: string | null
  status: string
  onboarding_status: string
  created_at: Date | string
  clicks: number
  conversions: number
  orders: number
  revenue: number
  commission_awarded: number
  payout_open: number
  conversion_rate: number
  link_stats: AffiliateLinkStat[]
}

type Bucket = {
  clicks: number
  conversions: number
  clickConversions: number
  revenue: number
  commission: number
  payoutOpen: number
  clicksByLink: Map<string, number>
  convByLink: Map<string, number>
}

function emptyBucket(): Bucket {
  return {
    clicks: 0,
    conversions: 0,
    clickConversions: 0,
    revenue: 0,
    commission: 0,
    payoutOpen: 0,
    clicksByLink: new Map(),
    convByLink: new Map(),
  }
}

function conversionRate(clickConversions: number, clicks: number): number {
  if (clicks <= 0) return 0
  return roundRate((clickConversions / clicks) * 100)
}

/**
 * F9.1 Admin Affiliate Performance — server-side aggregatie.
 * Hergebruikt bestaande list*-services; geen nieuwe tabellen of business rules.
 *
 * Schaalbaarheid: clicks/conversions/commissions worden gescand met take 10_000
 * (zelfde cap als store GET /store/affiliate/dashboard). Omzet per unieke
 * attributed order via listOrderLines (ADR-0030: Σ unit_price_snapshot × quantity).
 */
export async function executeAdminAffiliatePerformance(
  container: MedusaContainer,
  periodDays: AffiliatePerformancePeriodDays
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const since = daysAgo(periodDays)
  const sinceMs = since.getTime()
  const now = new Date()

  const affiliateRows = await aff.listAffiliates(
    {},
    { order: { created_at: "DESC" }, take: AFFILIATE_TAKE }
  )
  const links = (await aff.listAffiliateLinks(
    {},
    { take: LINK_TAKE, order: { created_at: "DESC" } }
  )) as ListedLink[]
  const clicks = (await aff.listClicks(
    {},
    { take: SCAN_TAKE, order: { created_at: "DESC" } }
  )) as ListedClick[]
  const conversions = (await aff.listConversions(
    {},
    { take: SCAN_TAKE, order: { created_at: "DESC" } }
  )) as ListedConversion[]
  const commissions = (await finance.listCommissions(
    { recipient_type: "Affiliate" },
    { take: SCAN_TAKE }
  )) as ListedCommission[]
  const payouts = (await finance.listPayouts(
    { recipient_type: "Affiliate" },
    { take: PAYOUT_TAKE }
  )) as ListedPayout[]

  const linkAffiliate = new Map<string, string>()
  const linksByAffiliate = new Map<string, ListedLink[]>()
  for (const link of links) {
    const affiliateId = link.affiliate_id ?? link.affiliate?.id
    if (!affiliateId) continue
    linkAffiliate.set(link.id, affiliateId)
    const list = linksByAffiliate.get(affiliateId) ?? []
    list.push(link)
    linksByAffiliate.set(affiliateId, list)
  }

  const buckets = new Map<string, Bucket>()
  function bucket(affiliateId: string): Bucket {
    let row = buckets.get(affiliateId)
    if (!row) {
      row = emptyBucket()
      buckets.set(affiliateId, row)
    }
    return row
  }

  const clickToLink = new Map<string, string>()
  for (const click of clicks) {
    if (asTime(click.created_at) < sinceMs) continue
    const linkId = click.affiliate_link_id ?? click.affiliate_link?.id
    if (!linkId) continue
    const affiliateId = linkAffiliate.get(linkId)
    if (!affiliateId) continue
    clickToLink.set(click.id, linkId)
    const b = bucket(affiliateId)
    b.clicks += 1
    b.clicksByLink.set(linkId, (b.clicksByLink.get(linkId) ?? 0) + 1)
  }

  const periodConversions = conversions.filter(
    (c) => !c.reversed_at && asTime(c.created_at) >= sinceMs
  )
  const conversionById = new Map(periodConversions.map((c) => [c.id, c]))
  const uniqueOrderIds = [...new Set(periodConversions.map((c) => c.order_id))]

  const revenueByOrder = new Map<string, number>()
  const chunkSize = 25
  for (let i = 0; i < uniqueOrderIds.length; i += chunkSize) {
    const chunk = uniqueOrderIds.slice(i, i + chunkSize)
    const sums = await Promise.all(
      chunk.map(async (orderId) => {
        const lines = await orders.listOrderLines({ order_id: orderId })
        const subtotal = lines.reduce((sum, line) => {
          return sum + Number(line.unit_price_snapshot) * Number(line.quantity)
        }, 0)
        return [orderId, roundMoney(subtotal)] as const
      })
    )
    for (const [orderId, subtotal] of sums) {
      revenueByOrder.set(orderId, subtotal)
    }
  }

  for (const conv of periodConversions) {
    const b = bucket(conv.affiliate_id)
    b.conversions += 1
    b.revenue = roundMoney(b.revenue + (revenueByOrder.get(conv.order_id) ?? 0))
    if (conv.click_id) {
      b.clickConversions += 1
      const linkId = clickToLink.get(conv.click_id)
      if (linkId) {
        b.convByLink.set(linkId, (b.convByLink.get(linkId) ?? 0) + 1)
      }
    }
  }

  for (const row of commissions) {
    if (row.status !== "Toegekend") continue
    if (!row.conversion_id) continue
    const conv = conversionById.get(row.conversion_id)
    if (!conv) continue
    const b = bucket(conv.affiliate_id)
    b.commission = roundMoney(b.commission + Number(row.amount))
  }

  for (const payout of payouts) {
    if (!payout.affiliate_id) continue
    if (!OPEN_PAYOUT_STATUSES.has(payout.status)) continue
    const b = bucket(payout.affiliate_id)
    b.payoutOpen = roundMoney(b.payoutOpen + Number(payout.amount))
  }

  const serialized = await Promise.all(
    affiliateRows.map((row) => toAdminAffiliate(container, row))
  )

  const affiliates: AffiliatePerformanceRow[] = serialized.map((row) => {
    const b = buckets.get(row.id) ?? emptyBucket()
    const affiliateLinks = linksByAffiliate.get(row.id) ?? []
    const link_stats: AffiliateLinkStat[] = affiliateLinks.map((link) => {
      const clickCount = b.clicksByLink.get(link.id) ?? 0
      const convCount = b.convByLink.get(link.id) ?? 0
      const ratio = conversionRate(convCount, clickCount)
      return {
        link_id: link.id,
        target_url: link.target_url,
        tracking_param: link.tracking_param,
        display_url: `${link.target_url}${link.target_url.includes("?") ? "&" : "?"}ref=${link.tracking_param}`,
        clicks: clickCount,
        conversions: convCount,
        conversion_rate: ratio,
        created_at: link.created_at,
      }
    })

    return {
      affiliate_id: row.id,
      customer_id: row.customer_id,
      legal_name: row.legal_name,
      status: row.onboarding_status,
      onboarding_status: row.onboarding_status,
      created_at: row.created_at,
      clicks: b.clicks,
      conversions: b.conversions,
      orders: b.conversions,
      revenue: b.revenue,
      commission_awarded: b.commission,
      payout_open: b.payoutOpen,
      conversion_rate: conversionRate(b.clickConversions, b.clicks),
      link_stats,
    }
  })

  affiliates.sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue
    return b.clicks - a.clicks
  })

  let totalClicks = 0
  let totalConversions = 0
  let totalClickConversions = 0
  let totalRevenue = 0
  let totalCommission = 0
  let totalPayoutOpen = 0
  for (const row of affiliates) {
    const b = buckets.get(row.affiliate_id) ?? emptyBucket()
    totalClicks += row.clicks
    totalConversions += row.conversions
    totalClickConversions += b.clickConversions
    totalRevenue = roundMoney(totalRevenue + row.revenue)
    totalCommission = roundMoney(totalCommission + row.commission_awarded)
    totalPayoutOpen = roundMoney(totalPayoutOpen + row.payout_open)
  }

  const active_affiliates = affiliates.filter(
    (a) => a.onboarding_status === "Goedgekeurd"
  ).length
  const pending_affiliates = affiliates.filter(
    (a) =>
      a.onboarding_status === "Ingediend" ||
      a.onboarding_status === "In beoordeling"
  ).length

  return {
    period_days: periodDays,
    period_from: since.toISOString(),
    period_to: now.toISOString(),
    conversion_rate_definition: CONVERSION_RATE_DEFINITION,
    totals: {
      active_affiliates,
      pending_affiliates,
      clicks: totalClicks,
      conversions: totalConversions,
      orders: totalConversions,
      revenue: totalRevenue,
      commission_awarded: totalCommission,
      payouts_scheduled: totalPayoutOpen,
      payout_open: totalPayoutOpen,
      conversion_rate: conversionRate(totalClickConversions, totalClicks),
    },
    affiliates,
  }
}
