/**
 * Admin Dashboard / Control Center — aggregaties uit bestaande admin-API's.
 * Geen demo-data; ontbrekende bronnen → unavailable (—).
 */

import {
  emptyPeriodComparison,
  type KpiPeriodComparison,
} from "./dashboard-kpi"
import type { FinanceDashboardSource } from "./finance-dashboard"
import type { PerformanceCatalogSource } from "./marketplace-performance"

import { adminFetch } from "./admin-fetch"
import { medusaBackendUrl } from "./medusa-backend-url"

export class DashboardApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "DashboardApiError"
    this.status = status
  }
}

async function request<T>(path: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await adminFetch(path, {
      cache: "no-store",
      signal: controller.signal,
    })
    const body: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      const message =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : "Dashboardgegevens laden mislukt."
      throw new DashboardApiError(message, response.status)
    }
    return body as T
  } finally {
    clearTimeout(timer)
  }
}

function startOfTodayUtc(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function isToday(iso: string | Date | undefined | null): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return false
  return t >= startOfTodayUtc().getTime()
}

function formatNlNumber(n: number): string {
  return new Intl.NumberFormat("nl-NL").format(n)
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

export type MetricSource = "api" | "unavailable" | "demo"

export type DashboardMetric = {
  value: string
  numeric: number | null
  source: MetricSource
  href?: string
  note?: string
} & KpiPeriodComparison

export type ModuleCard = {
  title: string
  meta: string
  href: string | null
  available: boolean
}

export type AttentionItem = {
  status: "ACTIE" | "INFO"
  count: number
  description: string
  href: string
}

export type SystemRow = {
  label: string
  status: string
  detail: string
  ok: boolean
}

export type DashboardActivityRow = {
  id: string
  label: string
  sublabel?: string
  href: string
  amount?: string
  date?: string
}

export type RecentOrderRow = {
  id: string
  orderNumber: string
  date: string
  sellerLabel: string
  amount: string
  status: string
  href: string
}

export type SellerQueueRow = {
  id: string
  companyName: string
  status: string
  date: string
  href: string
}

export type ProductQueueRow = {
  id: string
  productName: string
  sellerLabel: string
  status: string
  date: string | null
  href: string
}

export type AdCampaignRow = {
  id: string
  name: string
  sellerLabel: string
  placement: string
  periodLabel: string
  amount: string
  status: string
  href: string
}

export type FinanceSnapshot = {
  openPayoutCount: DashboardMetric
  openPayoutAmount: DashboardMetric
  advertisingRevenue: DashboardMetric
  openCommissions: DashboardMetric
  openInvoices: DashboardMetric
}

export type ModerationSnapshot = {
  openCases: DashboardMetric
  fraudSignals: DashboardMetric
  disputes: DashboardMetric
}

export type AdminDashboardData = {
  loadedAt: string
  backendReachable: boolean
  /** API-bereikbaarheid per bron (voor empty vs unavailable). */
  sources: {
    partners: boolean
    activeSellers: boolean
    sellerQueue: boolean
    products: boolean
    productApprovals: boolean
    orders: boolean
    payouts: boolean
    ads: boolean
    moderation: boolean
    audit: boolean
  }
  /** Compat / finance hub — lifetime/today snapshots. */
  platform: {
    totalSellers: DashboardMetric
    activeSellers: DashboardMetric
    pendingSellerApprovals: DashboardMetric
    totalProducts: DashboardMetric
    pendingProductApprovals: DashboardMetric
    totalOrders: DashboardMetric
    revenue: DashboardMetric
    openCommissions: DashboardMetric
    advertisingRevenue: DashboardMetric
    openPayouts: DashboardMetric
  }
  controlCenter: {
    pendingSellerApplications: SellerQueueRow[]
    pendingProductApprovals: ProductQueueRow[]
    recentOrders: RecentOrderRow[]
    pendingAdCampaigns: AdCampaignRow[]
    pendingFinancialActions: DashboardActivityRow[]
  }
  financeSnapshot: FinanceSnapshot
  moderationSnapshot: ModerationSnapshot
  hero: {
    activeSellers: DashboardMetric
    openModeration: DashboardMetric
    openDisputes: DashboardMetric
  }
  modules: ModuleCard[]
  marketplace: {
    activeProducts: DashboardMetric
    newProductsToday: DashboardMetric
    pendingVerifications: DashboardMetric
    newPartners: DashboardMetric
    pendingPartnerRequests: DashboardMetric
  }
  orders: {
    ordersToday: DashboardMetric
    openExceptions: DashboardMetric
    returns: DashboardMetric
  }
  finance: {
    revenueToday: DashboardMetric
    openPayouts: DashboardMetric
    commissionsToday: DashboardMetric
  }
  financeSource: FinanceDashboardSource
  performanceSource: PerformanceCatalogSource
  moderation: {
    openCases: DashboardMetric
    newAiSignals: DashboardMetric
    fraudReports: DashboardMetric
  }
  reviews: {
    newReviews: DashboardMetric
    pendingModeration: DashboardMetric
  }
  affiliate: {
    newAffiliates: DashboardMetric
    openApprovals: DashboardMetric
    clicksToday: DashboardMetric
    conversionsToday: DashboardMetric
  }
  system: SystemRow[]
  attention: AttentionItem[]
  auditPreview: Array<{
    id: string
    action_type: string
    entity_type: string
    created_at: string
  }>
}

type PartnerList = {
  partners: Array<{
    id: string
    created_at: string
    onboarding_status: string
    company: { legal_name: string } | null
  }>
  count: number
}

type QueueSummary = { queues: Array<{ key: string; count: number }> }

type QueueItems = {
  items: Array<{ age_hours: number; created_at: string; signal_code: string | null }>
  count: number
}

type OrdersList = {
  orders: Array<{
    order: {
      id: string
      order_number: string
      seller_id: string
      payment_status: string
      created_at: string
      exception_status: string | null
    }
    order_total: number
  }>
  count: number
}

type ReturnsList = {
  returns: Array<{ id: string; status: string }>
  count?: number
  open_count?: number
}

type PayoutsList = {
  payouts: Array<{
    id: string
    amount: number
    status: string
    created_at: string
    processed_at?: string | null
    recipient_type: string
  }>
}

type ProductsList = {
  products: Array<{
    id: string
    lifecycle_status: string
    created_at?: string
  }>
  count: number
}

type AffiliatesList = {
  affiliates: Array<{
    id: string
    onboarding_status: string
    created_at: string
  }>
}

type AuditList = {
  audit_log: Array<{
    id: string
    action_type: string
    entity_type: string
    created_at: string
  }>
}

type ApprovalsList = {
  products: Array<{
    id: string
    title: string | null
    seller_name?: string | null
    publication_status?: string | null
    requested_at?: string | null
  }>
  count: number
}

type AdCampaignsList = {
  campaigns: Array<{
    id: string
    name: string
    seller_id: string
    status: string
    placement: string
    total_price: number
    created_at: string
    weeks?: Array<{ week_start: string; week_end: string }>
  }>
}

type ComplianceEvidenceList = {
  evidence: Array<{ id: string; product_id: string; status: string }>
  count: number
}

async function safe<T>(
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Onbekende fout",
    }
  }
}

async function probeBackendReachable(timeoutMs = 4000): Promise<{
  ok: boolean
  detail: string
}> {
  const backend = medusaBackendUrl()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    try {
      const res = await fetch(`${backend}/health`, {
        cache: "no-store",
        signal: controller.signal,
      })
      if (res.ok) {
        return { ok: true, detail: `${backend}/health` }
      }
    } catch {
      // CORS/network op /health — val terug op admin-probe.
    }

    const res = await adminFetch(
      `/admin/partner-onboarding?tab=active&limit=1`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    )
    if (res.status > 0) {
      return {
        ok: true,
        detail: `${backend} bereikbaar (admin-probe; /health zonder browser-CORS)`,
      }
    }
    return { ok: false, detail: "Geen verbinding met de backend" }
  } catch {
    return { ok: false, detail: "Geen verbinding met de backend" }
  } finally {
    clearTimeout(timer)
  }
}

function metric(
  numeric: number | null,
  source: MetricSource,
  opts?: { href?: string; note?: string; format?: "number" | "euro" }
): DashboardMetric {
  if (numeric == null || source === "unavailable") {
    return {
      value: "—",
      numeric: null,
      source: source === "demo" ? "demo" : "unavailable",
      href: opts?.href,
      note: opts?.note ?? "Geen backend-endpoint beschikbaar",
      ...emptyPeriodComparison(null),
    }
  }
  const value =
    opts?.format === "euro" ? formatEuro(numeric) : formatNlNumber(numeric)
  return {
    value,
    numeric,
    source,
    href: opts?.href,
    note: opts?.note,
    ...emptyPeriodComparison(numeric),
  }
}

function sellerLabel(
  sellerId: string,
  nameBySellerId: Map<string, string>
): string {
  return nameBySellerId.get(sellerId) ?? sellerId
}

function campaignPeriodLabel(
  weeks: Array<{ week_start: string; week_end: string }> | undefined
): string {
  if (!weeks || weeks.length === 0) return "—"
  const starts = weeks.map((w) => new Date(w.week_start).getTime())
  const ends = weeks.map((w) => new Date(w.week_end).getTime())
  const from = new Date(Math.min(...starts))
  const to = new Date(Math.max(...ends))
  return `${from.toLocaleDateString("nl-NL")} – ${to.toLocaleDateString("nl-NL")}`
}

function placementLabel(p: string): string {
  if (p === "homepage") return "Homepage"
  if (p === "category") return "Categorie"
  if (p === "search") return "Zoekresultaat"
  return p
}

/** Campagnes die Admin-actie vereisen (bestaande status). */
const AD_ACTION_STATUSES = new Set(["pending_review"])

/** Omzet-achtige ad-statussen (bestaande total_price, geen nieuwe berekening). */
const AD_REVENUE_STATUSES = new Set([
  "approved",
  "scheduled",
  "active",
  "completed",
])

/**
 * Laadt alle dashboard-aggregaties uit bestaande admin-API's.
 */
export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const healthProbe = await probeBackendReachable()

  const [
    activePartners,
    queuePartners,
    allPartners,
    queues,
    fraudQueue,
    hoogRisico,
    ordersAll,
    ordersExceptions,
    returns,
    payouts,
    products,
    affiliates,
    audit,
    productApprovals,
    adCampaigns,
    complianceEvidence,
  ] = await Promise.all([
    safe(() =>
      request<PartnerList>("/admin/partner-onboarding?tab=active&limit=1")
    ),
    safe(() =>
      request<PartnerList>("/admin/partner-onboarding?tab=queue&limit=50")
    ),
    safe(() =>
      request<PartnerList>("/admin/partner-onboarding?tab=all&limit=500")
    ),
    safe(() => request<QueueSummary>("/admin/moderation/queues")),
    safe(() => request<QueueItems>("/admin/moderation/queues/fraude")),
    safe(() =>
      request<QueueItems>("/admin/moderation/queues/hoog-risico")
    ),
    safe(() => request<OrdersList>("/admin/order-service/orders")),
    safe(() =>
      request<OrdersList>("/admin/order-service/orders?exception=open")
    ),
    safe(() =>
      request<ReturnsList>("/admin/order-service/returns?open=1")
    ),
    safe(() => request<PayoutsList>("/admin/finance/payouts")),
    safe(() => request<ProductsList>("/admin/product-cloud/products")),
    safe(() => request<AffiliatesList>("/admin/affiliates")),
    safe(() => request<AuditList>("/admin/audit-log?limit=8")),
    safe(() => request<ApprovalsList>("/admin/product-cloud/approvals")),
    safe(() => request<AdCampaignsList>("/admin/advertising/campaigns")),
    safe(() =>
      request<ComplianceEvidenceList>(
        "/admin/product-cloud/compliance/evidence"
      )
    ),
  ])

  const anyAdminReachable =
    activePartners.ok ||
    queues.ok ||
    ordersAll.ok ||
    payouts.ok ||
    products.ok ||
    audit.ok ||
    returns.ok ||
    affiliates.ok

  const backendReachable = healthProbe.ok || anyAdminReachable
  const backendStatusDetail = backendReachable
    ? healthProbe.ok
      ? healthProbe.detail
      : `${medusaBackendUrl()} bereikbaar via admin-API's`
    : healthProbe.detail

  const nameBySellerId = new Map<string, string>()
  if (allPartners.ok) {
    for (const p of allPartners.data.partners) {
      const name = p.company?.legal_name?.trim()
      if (name) nameBySellerId.set(p.id, name)
    }
  }
  if (queuePartners.ok) {
    for (const p of queuePartners.data.partners) {
      const name = p.company?.legal_name?.trim()
      if (name) nameBySellerId.set(p.id, name)
    }
  }

  const queueCountMap = new Map<string, number>()
  if (queues.ok) {
    for (const q of queues.data.queues) queueCountMap.set(q.key, q.count)
  }
  const moderationTotal = queues.ok
    ? queues.data.queues.reduce((s, q) => s + q.count, 0)
    : null
  const disputesCount = queues.ok ? (queueCountMap.get("disputes") ?? 0) : null
  const fraudCount = queues.ok ? (queueCountMap.get("fraude") ?? 0) : null

  let oldestDays: number | null = null
  if (fraudQueue.ok && fraudQueue.data.items.length > 0) {
    const maxHours = Math.max(
      ...fraudQueue.data.items.map((i) => i.age_hours ?? 0)
    )
    oldestDays = Math.max(1, Math.round(maxHours / 24))
  }

  const aiSignalsToday =
    fraudQueue.ok || hoogRisico.ok
      ? [
          ...(fraudQueue.ok ? fraudQueue.data.items : []),
          ...(hoogRisico.ok ? hoogRisico.data.items : []),
        ].filter((i) => isToday(i.created_at) && i.signal_code).length
      : null

  const activeProductCount = products.ok
    ? products.data.products.filter((p) => p.lifecycle_status === "Actief")
        .length
    : null
  const newProductsToday = products.ok
    ? products.data.products.filter((p) => isToday(p.created_at)).length
    : null

  const newPartnersToday = allPartners.ok
    ? allPartners.data.partners.filter((p) => isToday(p.created_at)).length
    : null
  const pendingPartnerRequests = queuePartners.ok
    ? queuePartners.data.count
    : null
  const activeSellers = activePartners.ok ? activePartners.data.count : null
  const totalSellers = allPartners.ok ? allPartners.data.count : null
  const totalProducts = products.ok ? products.data.count : null
  const pendingProductApprovals = productApprovals.ok
    ? productApprovals.data.count
    : null
  const totalOrders = ordersAll.ok ? ordersAll.data.count : null

  const actionAdCampaigns = adCampaigns.ok
    ? adCampaigns.data.campaigns.filter((c) =>
        AD_ACTION_STATUSES.has(String(c.status).toLowerCase())
      )
    : []
  const advertisingRevenue = adCampaigns.ok
    ? adCampaigns.data.campaigns
        .filter((c) =>
          AD_REVENUE_STATUSES.has(String(c.status).toLowerCase())
        )
        .reduce((s, c) => s + (Number(c.total_price) || 0), 0)
    : null

  const pendingCompliance = complianceEvidence.ok
    ? complianceEvidence.data.count
    : null

  const ordersToday = ordersAll.ok
    ? ordersAll.data.orders.filter((o) => isToday(o.order.created_at)).length
    : null
  const revenueToday = ordersAll.ok
    ? ordersAll.data.orders
        .filter((o) => isToday(o.order.created_at))
        .reduce((s, o) => s + (Number(o.order_total) || 0), 0)
    : null
  const openExceptions = ordersExceptions.ok
    ? ordersExceptions.data.count
    : null
  const returnsCount = returns.ok
    ? (returns.data.open_count ?? returns.data.count ?? returns.data.returns.length)
    : null

  const openPayoutList = payouts.ok
    ? payouts.data.payouts.filter((p) =>
        ["Gepland", "In behandeling"].includes(p.status)
      )
    : []
  const openPayouts = payouts.ok ? openPayoutList.length : null
  const openPayoutAmount = payouts.ok
    ? openPayoutList.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : null

  const newAffiliates = affiliates.ok
    ? affiliates.data.affiliates.filter((a) => isToday(a.created_at)).length
    : null
  const openAffiliateApprovals = affiliates.ok
    ? affiliates.data.affiliates.filter((a) =>
        ["Ingediend", "In beoordeling"].includes(a.onboarding_status)
      ).length
    : null

  const attention: AttentionItem[] = []
  if ((pendingPartnerRequests ?? 0) > 0) {
    attention.push({
      status: "ACTIE",
      count: pendingPartnerRequests!,
      description: "seller-aanvragen wachten op beoordeling",
      href: "/partners",
    })
  }
  if ((pendingProductApprovals ?? 0) > 0) {
    attention.push({
      status: "ACTIE",
      count: pendingProductApprovals!,
      description: "producten wachten op goedkeuring",
      href: "/product-cloud/products/approvals",
    })
  }
  if (actionAdCampaigns.length > 0) {
    attention.push({
      status: "ACTIE",
      count: actionAdCampaigns.length,
      description: "advertising-campagnes in beoordeling",
      href: "/advertising/campaigns",
    })
  }
  if ((openPayouts ?? 0) > 0) {
    attention.push({
      status: "INFO",
      count: openPayouts!,
      description: "openstaande uitbetalingen",
      href: "/finance",
    })
  }
  if ((moderationTotal ?? 0) > 0) {
    attention.push({
      status: "ACTIE",
      count: moderationTotal!,
      description: "openstaande moderatiezaken",
      href: "/moderation",
    })
  }
  if ((returnsCount ?? 0) > 0) {
    attention.push({
      status: "ACTIE",
      count: returnsCount!,
      description: "retouren in behandeling",
      href: "/returns",
    })
  }
  if ((openExceptions ?? 0) > 0) {
    attention.push({
      status: "ACTIE",
      count: openExceptions!,
      description: "orderproblemen / uitzonderingen",
      href: "/orders",
    })
  }
  if ((fraudCount ?? 0) > 0) {
    attention.push({
      status: "ACTIE",
      count: fraudCount!,
      description: "fraudesignalen in wachtrij",
      href: "/moderation",
    })
  }
  if ((disputesCount ?? 0) > 0) {
    attention.push({
      status: "ACTIE",
      count: disputesCount!,
      description: "geschillen in behandeling",
      href: "/moderation",
    })
  }

  const pendingSellerApplications: SellerQueueRow[] = queuePartners.ok
    ? queuePartners.data.partners.slice(0, 5).map((p) => ({
        id: p.id,
        companyName:
          p.company?.legal_name?.trim() || `Seller ${p.id.slice(-8)}`,
        status: p.onboarding_status,
        date: p.created_at,
        href: `/partners/${p.id}`,
      }))
    : []

  const pendingProductApprovalRows: ProductQueueRow[] = productApprovals.ok
    ? productApprovals.data.products.slice(0, 5).map((p) => ({
        id: p.id,
        productName: p.title?.trim() || p.id,
        sellerLabel: p.seller_name?.trim() || "—",
        status: p.publication_status?.trim() || "In review",
        date: p.requested_at ?? null,
        href: `/product-cloud/products/${p.id}`,
      }))
    : []

  const recentOrders: RecentOrderRow[] = ordersAll.ok
    ? [...ordersAll.data.orders]
        .sort(
          (a, b) =>
            new Date(b.order.created_at).getTime() -
            new Date(a.order.created_at).getTime()
        )
        .slice(0, 5)
        .map((o) => ({
          id: o.order.id,
          orderNumber: o.order.order_number || o.order.id,
          date: o.order.created_at,
          sellerLabel: sellerLabel(o.order.seller_id, nameBySellerId),
          amount: formatEuro(Number(o.order_total) || 0),
          status: o.order.payment_status || "—",
          href: `/orders/${o.order.id}`,
        }))
    : []

  const pendingAdRows: AdCampaignRow[] = actionAdCampaigns
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      sellerLabel: sellerLabel(c.seller_id, nameBySellerId),
      placement: placementLabel(c.placement),
      periodLabel: campaignPeriodLabel(c.weeks),
      amount: formatEuro(Number(c.total_price) || 0),
      status: c.status,
      href: "/advertising/campaigns",
    }))

  const pendingFinancialActions: DashboardActivityRow[] = openPayoutList
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      label: `Uitbetaling ${p.recipient_type}`,
      sublabel: p.status,
      href: "/finance",
      amount: formatEuro(Number(p.amount) || 0),
      date: p.created_at,
    }))

  const system: SystemRow[] = [
    {
      label: "Medusa / Backend API",
      status: backendReachable ? "ONLINE" : "ERROR",
      detail: backendStatusDetail,
      ok: backendReachable,
    },
    {
      label: "Partner API",
      status: activePartners.ok ? "OK" : "ERROR",
      detail: activePartners.ok
        ? "partner-onboarding bereikbaar"
        : activePartners.error,
      ok: activePartners.ok,
    },
    {
      label: "Product Cloud API",
      status: products.ok ? "OK" : "ERROR",
      detail: products.ok ? "products bereikbaar" : products.error,
      ok: products.ok,
    },
    {
      label: "Order Service API",
      status: ordersAll.ok ? "OK" : "ERROR",
      detail: ordersAll.ok ? "orders bereikbaar" : ordersAll.error,
      ok: ordersAll.ok,
    },
    {
      label: "Finance API",
      status: payouts.ok ? "OK" : "ERROR",
      detail: payouts.ok ? "payouts bereikbaar" : payouts.error,
      ok: payouts.ok,
    },
    {
      label: "Moderation API",
      status: queues.ok ? "OK" : "ERROR",
      detail: queues.ok ? "queues bereikbaar" : queues.error,
      ok: queues.ok,
    },
    {
      label: "Audit Log",
      status: audit.ok ? "OK" : "ERROR",
      detail: audit.ok
        ? `${audit.data.audit_log.length} recente events`
        : audit.error,
      ok: audit.ok,
    },
  ]

  const partnerQueueMeta =
    pendingPartnerRequests != null
      ? `${formatNlNumber(pendingPartnerRequests)} nieuwe aanvragen`
      : "Gegevens niet beschikbaar"
  const moderationMeta =
    moderationTotal != null
      ? oldestDays != null
        ? `${formatNlNumber(moderationTotal)} items — oudste: ${oldestDays} dagen`
        : `${formatNlNumber(moderationTotal)} items`
      : "Gegevens niet beschikbaar"
  const disputesMeta =
    disputesCount != null
      ? `${formatNlNumber(disputesCount)} items`
      : "Gegevens niet beschikbaar"

  return {
    loadedAt: new Date().toISOString(),
    backendReachable,
    sources: {
      partners: allPartners.ok,
      activeSellers: activePartners.ok,
      sellerQueue: queuePartners.ok,
      products: products.ok,
      productApprovals: productApprovals.ok,
      orders: ordersAll.ok,
      payouts: payouts.ok,
      ads: adCampaigns.ok,
      moderation: queues.ok,
      audit: audit.ok,
    },
    platform: {
      totalSellers: metric(totalSellers, totalSellers != null ? "api" : "unavailable", {
        href: "/partners",
      }),
      activeSellers: metric(activeSellers, activeSellers != null ? "api" : "unavailable", {
        href: "/partners",
      }),
      pendingSellerApprovals: metric(
        pendingPartnerRequests,
        pendingPartnerRequests != null ? "api" : "unavailable",
        { href: "/partners" }
      ),
      totalProducts: metric(totalProducts, totalProducts != null ? "api" : "unavailable", {
        href: "/product-cloud/products",
      }),
      pendingProductApprovals: metric(
        pendingProductApprovals,
        pendingProductApprovals != null ? "api" : "unavailable",
        { href: "/product-cloud/products/approvals" }
      ),
      totalOrders: metric(totalOrders, totalOrders != null ? "api" : "unavailable", {
        href: "/orders",
      }),
      revenue: metric(
        revenueToday,
        revenueToday != null ? "api" : "unavailable",
        { format: "euro", href: "/finance", note: "Orders vandaag (order_total)" }
      ),
      openCommissions: metric(null, "unavailable", {
        format: "euro",
        note: "Geen admin commissie-aggregatie-API",
      }),
      advertisingRevenue: metric(
        advertisingRevenue,
        advertisingRevenue != null ? "api" : "unavailable",
        {
          format: "euro",
          href: "/advertising/campaigns",
          note: "Som total_price (approved/scheduled/active/completed)",
        }
      ),
      openPayouts: metric(
        openPayouts,
        openPayouts != null ? "api" : "unavailable",
        { href: "/finance" }
      ),
    },
    controlCenter: {
      pendingSellerApplications,
      pendingProductApprovals: pendingProductApprovalRows,
      recentOrders,
      pendingAdCampaigns: pendingAdRows,
      pendingFinancialActions,
    },
    financeSnapshot: {
      openPayoutCount: metric(
        openPayouts,
        openPayouts != null ? "api" : "unavailable",
        { href: "/finance", note: "Status Gepland / In behandeling" }
      ),
      openPayoutAmount: metric(
        openPayoutAmount,
        openPayoutAmount != null ? "api" : "unavailable",
        {
          format: "euro",
          href: "/finance",
          note: "Som bedragen open payouts",
        }
      ),
      advertisingRevenue: metric(
        advertisingRevenue,
        advertisingRevenue != null ? "api" : "unavailable",
        {
          format: "euro",
          href: "/advertising/campaigns",
          note: "Som campaign total_price (goedgekeurd/actief)",
        }
      ),
      openCommissions: metric(null, "unavailable", {
        format: "euro",
        note: "Geen admin commissie-aggregatie-API",
      }),
      openInvoices: metric(null, "unavailable", {
        note: "Geen admin factuur-list-API (alleen POST invoicing)",
      }),
    },
    moderationSnapshot: {
      openCases: metric(
        moderationTotal,
        moderationTotal != null ? "api" : "unavailable",
        { href: "/moderation" }
      ),
      fraudSignals: metric(
        fraudCount,
        fraudCount != null ? "api" : "unavailable",
        { href: "/moderation" }
      ),
      disputes: metric(
        disputesCount,
        disputesCount != null ? "api" : "unavailable",
        { href: "/moderation" }
      ),
    },
    hero: {
      activeSellers: metric(activeSellers, activeSellers != null ? "api" : "unavailable", {
        href: "/partners",
      }),
      openModeration: metric(
        moderationTotal,
        moderationTotal != null ? "api" : "unavailable",
        { href: "/moderation" }
      ),
      openDisputes: metric(
        disputesCount,
        disputesCount != null ? "api" : "unavailable",
        { href: "/moderation" }
      ),
    },
    modules: [
      {
        title: "Partnerbeheer",
        meta: partnerQueueMeta,
        href: "/partners",
        available: true,
      },
      {
        title: "Moderatiewachtrij",
        meta: moderationMeta,
        href: "/moderation",
        available: true,
      },
      {
        title: "Geschillenbeheer",
        meta: disputesMeta,
        href: "/moderation",
        available: true,
      },
    ],
    marketplace: {
      activeProducts: metric(
        activeProductCount,
        activeProductCount != null ? "api" : "unavailable",
        { note: "Product Cloud lifecycle = Actief" }
      ),
      newProductsToday: metric(
        newProductsToday,
        newProductsToday != null ? "api" : "unavailable"
      ),
      pendingVerifications: metric(
        pendingCompliance,
        pendingCompliance != null ? "api" : "unavailable",
        { href: "/product-cloud/compliance", note: "Compliance bewijs in review" }
      ),
      newPartners: metric(
        newPartnersToday,
        newPartnersToday != null ? "api" : "unavailable",
        { href: "/partners" }
      ),
      pendingPartnerRequests: metric(
        pendingPartnerRequests,
        pendingPartnerRequests != null ? "api" : "unavailable",
        { href: "/partners" }
      ),
    },
    orders: {
      ordersToday: metric(
        ordersToday,
        ordersToday != null ? "api" : "unavailable",
        { href: "/orders" }
      ),
      openExceptions: metric(
        openExceptions,
        openExceptions != null ? "api" : "unavailable",
        { href: "/orders" }
      ),
      returns: metric(
        returnsCount,
        returnsCount != null ? "api" : "unavailable",
        { href: "/returns" }
      ),
    },
    finance: {
      revenueToday: metric(
        revenueToday,
        revenueToday != null ? "api" : "unavailable",
        { format: "euro", note: "Som order_total van orders vandaag" }
      ),
      openPayouts: metric(
        openPayouts,
        openPayouts != null ? "api" : "unavailable",
        { note: "Status Gepland / In behandeling" }
      ),
      commissionsToday: metric(null, "unavailable", {
        format: "euro",
        note: "Geen admin commissie-list-API (alleen payouts)",
      }),
    },
    financeSource: {
      ordersOk: ordersAll.ok,
      payoutsOk: payouts.ok,
      orders: ordersAll.ok
        ? ordersAll.data.orders.map((o) => ({
            created_at: o.order.created_at,
            order_total: Number(o.order_total) || 0,
          }))
        : [],
      payouts: payouts.ok
        ? payouts.data.payouts.map((p) => ({
            amount: Number(p.amount) || 0,
            status: p.status,
            created_at: p.created_at,
            processed_at: p.processed_at ?? null,
            recipient_type: p.recipient_type,
          }))
        : [],
    },
    performanceSource: {
      partnersOk: allPartners.ok,
      productsOk: products.ok,
      partnersCreatedAt: allPartners.ok
        ? allPartners.data.partners.map((p) => p.created_at)
        : [],
      productsCreatedAt: products.ok
        ? products.data.products
            .map((p) => p.created_at)
            .filter((iso): iso is string => Boolean(iso))
        : [],
    },
    moderation: {
      openCases: metric(
        moderationTotal,
        moderationTotal != null ? "api" : "unavailable",
        { href: "/moderation" }
      ),
      newAiSignals: metric(
        aiSignalsToday,
        aiSignalsToday != null ? "api" : "unavailable",
        { href: "/moderation", note: "Fraude + hoog-risico met signal_code vandaag" }
      ),
      fraudReports: metric(
        fraudCount,
        fraudCount != null ? "api" : "unavailable",
        { href: "/moderation" }
      ),
    },
    reviews: {
      newReviews: metric(null, "unavailable", {
        note: "Geen admin Review-list-API (alleen store/reviews)",
      }),
      pendingModeration: metric(null, "unavailable", {
        note: "Review-moderatie niet als aparte admin-resource beschikbaar",
      }),
    },
    affiliate: {
      newAffiliates: metric(
        newAffiliates,
        newAffiliates != null ? "api" : "unavailable"
      ),
      openApprovals: metric(
        openAffiliateApprovals,
        openAffiliateApprovals != null ? "api" : "unavailable"
      ),
      clicksToday: metric(null, "unavailable", {
        note: "Geen admin clicks-aggregatie-API",
      }),
      conversionsToday: metric(null, "unavailable", {
        note: "Geen admin conversions-aggregatie-API",
      }),
    },
    system,
    attention,
    auditPreview: audit.ok ? audit.data.audit_log : [],
  }
}

export { formatNlNumber, formatEuro }
