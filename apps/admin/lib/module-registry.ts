/**
 * Admin Shell — grouped navigation (P2.18 Control Center).
 * Reuses existing routes; no duplicate modules.
 */

export type AdminNavItem = {
  id: string
  naam: string
  route: string | null
  icoon: string
  permissie: "Beheerder"
  navigatiepositie: number
  available: boolean
}

export type AdminNavGroup = {
  id: string
  label: string
  items: AdminNavItem[]
}

/** Flat list for active-route matching and compat. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "platform",
    label: "Platform",
    items: [
      {
        id: "dashboard",
        naam: "Dashboard",
        route: "/dashboard",
        icoon: "dashboard",
        permissie: "Beheerder",
        navigatiepositie: 10,
        available: true,
      },
      {
        id: "sellers",
        naam: "Sellers",
        route: "/partners",
        icoon: "partners",
        permissie: "Beheerder",
        navigatiepositie: 20,
        available: true,
      },
      {
        id: "brand-ownership",
        naam: "Merkeigenaarschap",
        route: "/partners/brand-ownership",
        icoon: "partners",
        permissie: "Beheerder",
        navigatiepositie: 21,
        available: true,
      },
      {
        id: "products",
        naam: "Producten",
        route: "/product-cloud/products",
        icoon: "products",
        permissie: "Beheerder",
        navigatiepositie: 30,
        available: true,
      },
      {
        id: "product-links",
        naam: "Productkoppelingen",
        route: "/product-cloud/product-links",
        icoon: "products",
        permissie: "Beheerder",
        navigatiepositie: 31,
        available: true,
      },
      {
        id: "change-proposals",
        naam: "Wijzigingsvoorstellen",
        route: "/product-cloud/change-proposals",
        icoon: "products",
        permissie: "Beheerder",
        navigatiepositie: 31.5,
        available: true,
      },
      {
        id: "categories",
        naam: "Categorieën",
        route: "/product-cloud/categories",
        icoon: "products",
        permissie: "Beheerder",
        navigatiepositie: 32,
        available: true,
      },
      {
        id: "european-ownership",
        naam: "Europese eigendom",
        route: "/product-cloud/european-ownership",
        icoon: "products",
        permissie: "Beheerder",
        navigatiepositie: 33,
        available: true,
      },
      {
        id: "orders",
        naam: "Orders",
        route: "/orders",
        icoon: "orders",
        permissie: "Beheerder",
        navigatiepositie: 40,
        available: true,
      },
      {
        id: "returns",
        naam: "Retouren",
        route: "/returns",
        icoon: "returns",
        permissie: "Beheerder",
        navigatiepositie: 45,
        available: true,
      },
    ],
  },
  {
    id: "commercial",
    label: "Commercieel",
    items: [
      {
        id: "advertising",
        naam: "Advertising",
        route: "/advertising/campaigns",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 50,
        available: true,
      },
      {
        id: "affiliate",
        naam: "Affiliate",
        route: "/affiliate",
        icoon: "affiliate",
        permissie: "Beheerder",
        navigatiepositie: 60,
        available: true,
      },
    ],
  },
  {
    id: "engagement",
    label: "Marketing & Communicatie",
    items: [
      {
        id: "engagement-overview",
        naam: "Vandaag",
        route: "/engagement",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 65,
        available: true,
      },
      {
        id: "engagement-prospects",
        naam: "Prospects",
        route: "/engagement/prospects",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 66,
        available: true,
      },
      {
        id: "engagement-consumers",
        naam: "Consumenten",
        route: "/engagement/consumers",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 66.5,
        available: true,
      },
      {
        id: "engagement-affiliates",
        naam: "Affiliate Partners",
        route: "/engagement/affiliates",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 66.7,
        available: true,
      },
      {
        id: "engagement-templates",
        naam: "Berichten",
        route: "/engagement/templates",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 67,
        available: true,
      },
      {
        id: "engagement-automations",
        naam: "Automatiseringen",
        route: "/engagement/automations",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 68,
        available: true,
      },
      {
        id: "engagement-history",
        naam: "Historie",
        route: "/engagement/history",
        icoon: "marketing",
        permissie: "Beheerder",
        navigatiepositie: 69,
        available: true,
      },
    ],
  },
  {
    id: "financial",
    label: "Financieel",
    items: [
      {
        id: "finance",
        naam: "Finance",
        route: "/finance",
        icoon: "finance",
        permissie: "Beheerder",
        navigatiepositie: 70,
        available: true,
      },
    ],
  },
  {
    id: "content",
    label: "Content & Moderatie",
    items: [
      {
        id: "cms",
        naam: "CMS",
        route: "/cms",
        icoon: "cms",
        permissie: "Beheerder",
        navigatiepositie: 80,
        available: true,
      },
      {
        id: "moderation",
        naam: "Moderatie",
        route: "/moderation",
        icoon: "moderation",
        permissie: "Beheerder",
        navigatiepositie: 90,
        available: true,
      },
    ],
  },
  {
    id: "settings",
    label: "Instellingen",
    items: [
      {
        id: "settings",
        naam: "Instellingen",
        route: "/settings",
        icoon: "settings",
        permissie: "Beheerder",
        navigatiepositie: 100,
        available: true,
      },
    ],
  },
]

/** Secondary routes not in main nav but part of admin modules. */
export const ADMIN_SECONDARY_ROUTES: Array<{ route: string; parentId: string }> =
  [
    { route: "/product-cloud/products/approvals", parentId: "products" },
    { route: "/product-cloud/fields", parentId: "products" },
    { route: "/product-cloud/compliance", parentId: "products" },
    { route: "/product-cloud/european-ownership", parentId: "products" },
    { route: "/product-cloud/translations", parentId: "products" },
    { route: "/partners/brand-ownership", parentId: "sellers" },
    { route: "/returns", parentId: "returns" },
    { route: "/marketplace", parentId: "dashboard" },
    { route: "/cms/design", parentId: "cms" },
    { route: "/cms/actions", parentId: "cms" },
    { route: "/ai/content", parentId: "cms" },
    { route: "/finance/transactions", parentId: "finance" },
    { route: "/finance/sellers", parentId: "finance" },
    { route: "/finance/affiliates", parentId: "finance" },
    { route: "/finance/payouts", parentId: "finance" },
  ]

/** Compat voor bestaande imports. */
export type AdminModuleContract = {
  naam: string
  route: string
  icoon: string
  permissie: "Beheerder"
  navigatiepositie: number
}

export const ADMIN_MODULES: AdminModuleContract[] = ADMIN_NAV_GROUPS.flatMap(
  (g) =>
    g.items
      .filter((m): m is AdminNavItem & { route: string } => m.route != null)
      .map((m) => ({
        naam: m.naam,
        route: m.route,
        icoon: m.icoon,
        permissie: m.permissie,
        navigatiepositie: m.navigatiepositie,
      }))
)

/** @deprecated Use ADMIN_NAV_GROUPS */
export const ADMIN_PRIMARY_NAV = ADMIN_NAV_GROUPS.flatMap((g) => g.items)

/** @deprecated Use ADMIN_NAV_GROUPS */
export const ADMIN_MORE_NAV: AdminNavItem[] = []

export function navGroupsSorted(): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((g) => ({
    ...g,
    items: [...g.items].sort(
      (a, b) => a.navigatiepositie - b.navigatiepositie
    ),
  }))
}

export function modulesSorted() {
  return [...ADMIN_MODULES].sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

/** @deprecated Use navGroupsSorted */
export function primaryNavSorted() {
  return ADMIN_NAV_GROUPS.flatMap((g) => g.items).sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

/** @deprecated Use navGroupsSorted */
export function moreNavSorted() {
  return [] as AdminNavItem[]
}

export function allNavItems(): AdminNavItem[] {
  return ADMIN_NAV_GROUPS.flatMap((g) => g.items)
}

/**
 * Een oudermenu (bijv. /engagement) is niet actief wanneer een langer
 * menupad (bijv. /engagement/prospects) de huidige pagina dekt.
 */
export function isMostSpecificNavMatch(
  pathname: string,
  route: string,
  routes: string[]
): boolean {
  const matches = pathname === route || pathname.startsWith(`${route}/`)
  if (!matches) return false
  return !routes.some((other) => {
    if (other === route || other.length <= route.length) return false
    if (!other.startsWith(`${route}/`)) return false
    return pathname === other || pathname.startsWith(`${other}/`)
  })
}

export function findActiveNav(pathname: string): AdminNavItem | undefined {
  const allRoutes: Array<{ item: AdminNavItem; route: string }> = []

  for (const item of allNavItems()) {
    if (item.route) allRoutes.push({ item, route: item.route })
  }
  for (const sec of ADMIN_SECONDARY_ROUTES) {
    const parent = allNavItems().find((i) => i.id === sec.parentId)
    if (parent) allRoutes.push({ item: parent, route: sec.route })
  }

  const matches = allRoutes.filter(
    ({ route }) =>
      pathname === route || pathname.startsWith(`${route}/`)
  )
  return matches.sort(
    (a, b) => b.route.length - a.route.length
  )[0]?.item
}
