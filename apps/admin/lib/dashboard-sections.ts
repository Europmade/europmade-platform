/**
 * Declaratieve dashboardsecties — geen hardcode in de page.
 * extensions: Sprint 4-slots (nog niet gerenderd).
 */

import type { AdminDashboardData, DashboardMetric } from "./dashboard-api"

/** Toekomstige management-widgets per sectie (Sprint 4). */
export type DashboardExtensionKind =
  | "top_partners"
  | "top_products"
  | "top_categories"
  | "top_risers"
  | "top_fallers"
  | "growth"
  | "revenue_trend"

export type DashboardKpiDefinition = {
  id: string
  label: string
  linkLabel?: string
  select: (data: AdminDashboardData) => DashboardMetric
}

export type DashboardSectionDefinition = {
  id: string
  title: string
  kpis: DashboardKpiDefinition[]
  /** Voorbereiding: welke uitbreidingen deze sectie later mag krijgen. */
  extensions?: DashboardExtensionKind[]
}

export const DASHBOARD_HERO_KPIS: DashboardKpiDefinition[] = [
  {
    id: "active_partners",
    label: "Actieve partners",
    select: (d) => d.hero.activeSellers,
  },
  {
    id: "open_moderation",
    label: "Open moderatie-items",
    linkLabel: "Bekijk wachtrij",
    select: (d) => d.hero.openModeration,
  },
  {
    id: "open_disputes",
    label: "Geschillen",
    linkLabel: "Bekijk geschillen",
    select: (d) => d.hero.openDisputes,
  },
]

export const DASHBOARD_DOMAIN_SECTIONS: DashboardSectionDefinition[] = [
  {
    id: "marketplace",
    title: "Marketplace",
    extensions: ["top_products", "top_categories", "growth"],
    kpis: [
      {
        id: "active_products",
        label: "Actieve producten",
        select: (d) => d.marketplace.activeProducts,
      },
      {
        id: "new_products",
        label: "Nieuwe producten",
        select: (d) => d.marketplace.newProductsToday,
      },
      {
        id: "partner_requests",
        label: "Partneraanvragen",
        linkLabel: "Naar Partners",
        select: (d) => d.marketplace.pendingPartnerRequests,
      },
      {
        id: "pending_verifications",
        label: "Pending verificaties",
        select: (d) => d.marketplace.pendingVerifications,
      },
    ],
  },
  {
    id: "orders",
    title: "Orders",
    extensions: ["growth"],
    kpis: [
      {
        id: "orders_in_period",
        label: "Orders in periode",
        linkLabel: "Naar orders",
        select: (d) => d.orders.ordersToday,
      },
      {
        id: "open_exceptions",
        label: "Open uitzonderingen",
        linkLabel: "Naar orders",
        select: (d) => d.orders.openExceptions,
      },
      {
        id: "returns",
        label: "Retouren",
        select: (d) => d.orders.returns,
      },
    ],
  },
  {
    id: "moderation",
    title: "Moderatie",
    extensions: ["top_partners"],
    kpis: [
      {
        id: "moderation_cases",
        label: "Moderatiezaken",
        linkLabel: "Naar wachtrij",
        select: (d) => d.moderation.openCases,
      },
      {
        id: "fraud_signals",
        label: "Fraudesignalen",
        linkLabel: "Naar wachtrij",
        select: (d) => d.moderation.fraudReports,
      },
      {
        id: "disputes",
        label: "Geschillen",
        linkLabel: "Naar wachtrij",
        select: (d) => d.hero.openDisputes,
      },
    ],
  },
]
