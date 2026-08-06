/**
 * Admin Dashboard Home — aggregaties uit bestaande admin-API's (S3-11-02).
 * Geen nieuwe backend; client-side samenstelling voor weergave.
 */

import {
  emptyPeriodComparison,
  type KpiPeriodComparison,
} from "./dashboard-kpi"
import type { FinanceDashboardSource } from "./finance-dashboard"
import type { PerformanceCatalogSource } from "./marketplace-performance"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

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
    const response = await fetch(`${BACKEND_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
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
  label: string
  href: string
  severity: "normal" | "warning"
}

export type SystemRow = {
  label: string
  status: string
  detail: string
  ok: boolean
}

export type AdminDashboardData = {
  loadedAt: string
  backendReachable: boolean
  /** Wireframe #54 top-KPI's */
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
  /** Ruwe finance-bron voor periodbewuste management-KPI's (client-side). */
  financeSource: FinanceDashboardSource
  /** Catalogusbron voor Marketplace Performance (nieuwe partners/producten). */
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
  partners: Array<{ id: string; created_at: string; onboarding_status: string }>
  count: number
}

type QueueSummary = { queues: Array<{ key: string; count: number }> }

type QueueItems = {
  items: Array<{ age_hours: number; created_at: string; signal_code: string | null }>
  count: number
}

type OrdersList = {
  orders: Array<{
    order: { created_at: string; exception_status: string | null }
    order_total: number
  }>
  count: number
}

type ReturnsList = { returns: Array<{ id: string; status: string }> }

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

/**
 * Algemene backend-bereikbaarheid.
 * Primair: GET /health. Medusa zet op /health vaak geen ADMIN_CORS — de browser
 * krijgt dan "Failed to fetch" terwijl /admin/* wél bereikbaar is. Fallback:
 * lichte admin-probe; elke HTTP-status (incl. 401) telt als bereikbaar.
 */
async function probeBackendReachable(timeoutMs = 4000): Promise<{
  ok: boolean
  detail: string
}> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, {
        cache: "no-store",
        signal: controller.signal,
      })
      if (res.ok) {
        return { ok: true, detail: `${BACKEND_URL}/health` }
      }
    } catch {
      // CORS/network op /health — val terug op admin-probe.
    }

    const res = await fetch(
      `${BACKEND_URL}/admin/partner-onboarding?tab=active&limit=1`,
      {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
      }
    )
    if (res.status > 0) {
      return {
        ok: true,
        detail: `${BACKEND_URL} bereikbaar (admin-probe; /health zonder browser-CORS)`,
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

/**
 * Laadt alle dashboard-aggregaties. Bij totale backend-uitval: lege API-waarden
 * + expliciete unavailable/demo-markering (geen stille nep-KPI's).
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
  ] = await Promise.all([
    safe(() =>
      request<PartnerList>("/admin/partner-onboarding?tab=active&limit=1")
    ),
    safe(() =>
      request<PartnerList>("/admin/partner-onboarding?tab=queue&limit=50")
    ),
    safe(() =>
      request<PartnerList>("/admin/partner-onboarding?tab=all&limit=100")
    ),
    safe(() => request<QueueSummary>("/admin/moderation/queues")),
    safe(() =>
      request<QueueItems>("/admin/moderation/queues/fraude")
    ),
    safe(() =>
      request<QueueItems>("/admin/moderation/queues/hoog-risico")
    ),
    safe(() => request<OrdersList>("/admin/order-service/orders")),
    safe(() =>
      request<OrdersList>("/admin/order-service/orders?exception=open")
    ),
    safe(() => request<ReturnsList>("/admin/order-service/returns")),
    safe(() => request<PayoutsList>("/admin/finance/payouts")),
    safe(() => request<ProductsList>("/admin/product-cloud/products")),
    safe(() => request<AffiliatesList>("/admin/affiliates")),
    safe(() => request<AuditList>("/admin/audit-log?limit=8")),
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
      : `${BACKEND_URL} bereikbaar via admin-API's`
    : healthProbe.detail
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
  const returnsCount = returns.ok ? returns.data.returns.length : null

  const openPayouts = payouts.ok
    ? payouts.data.payouts.filter((p) =>
        ["Gepland", "In behandeling"].includes(p.status)
      ).length
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
      label: `${pendingPartnerRequests} partneraanvragen wachten op beoordeling`,
      href: "/partners",
      severity: "warning",
    })
  }
  if ((moderationTotal ?? 0) > 0) {
    attention.push({
      label: `${moderationTotal} openstaande moderatie-items`,
      href: "/moderation",
      severity: "warning",
    })
  }
  if ((returnsCount ?? 0) > 0) {
    attention.push({
      label: `${returnsCount} retouren in behandeling`,
      href: "/orders",
      severity: "warning",
    })
  }
  if ((disputesCount ?? 0) > 0) {
    attention.push({
      label: `${disputesCount} geschillen in behandeling`,
      href: "/moderation",
      severity: "warning",
    })
  }
  if ((openExceptions ?? 0) > 0) {
    attention.push({
      label: `${openExceptions} open order-uitzonderingen`,
      href: "/orders",
      severity: "warning",
    })
  }
  if ((fraudCount ?? 0) > 0) {
    attention.push({
      label: `${fraudCount} fraude-signalen in wachtrij`,
      href: "/moderation",
      severity: "warning",
    })
  }

  const system: SystemRow[] = [
    {
      label: "Medusa / Backend API",
      status: backendReachable ? "Online" : "Offline",
      detail: backendStatusDetail,
      ok: backendReachable,
    },
    {
      label: "Partner API",
      status: activePartners.ok ? "OK" : "Fout",
      detail: activePartners.ok
        ? "partner-onboarding bereikbaar"
        : activePartners.error,
      ok: activePartners.ok,
    },
    {
      label: "Moderation API",
      status: queues.ok ? "OK" : "Fout",
      detail: queues.ok ? "queues bereikbaar" : queues.error,
      ok: queues.ok,
    },
    {
      label: "Order Service API",
      status: ordersAll.ok ? "OK" : "Fout",
      detail: ordersAll.ok ? "orders bereikbaar" : ordersAll.error,
      ok: ordersAll.ok,
    },
    {
      label: "Finance API",
      status: payouts.ok ? "OK" : "Fout",
      detail: payouts.ok ? "payouts bereikbaar" : payouts.error,
      ok: payouts.ok,
    },
    {
      label: "Product Cloud API",
      status: products.ok ? "OK" : "Fout",
      detail: products.ok ? "products bereikbaar" : products.error,
      ok: products.ok,
    },
    {
      label: "Audit Log",
      status: audit.ok ? "OK" : "Fout",
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
        // Geen aparte Admin-route; geschillen-wachtrij zit in Moderation Center.
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
      pendingVerifications: metric(null, "unavailable", {
        note: "Verification Center heeft nog geen admin-API",
      }),
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
        { href: "/orders" }
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
