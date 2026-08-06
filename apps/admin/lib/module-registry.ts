/**
 * Admin Shell — navigatie via modulecontract (admin-shell/spec.md §1.9).
 */

export type AdminNavItem = {
  id: string
  naam: string
  route: string | null
  icoon: string
  permissie: "Beheerder"
  navigatiepositie: number
  primary: boolean
  available: boolean
}

export const ADMIN_PRIMARY_NAV: AdminNavItem[] = [
  {
    id: "dashboard",
    naam: "Dashboard",
    route: "/dashboard",
    icoon: "dashboard",
    permissie: "Beheerder",
    navigatiepositie: 10,
    primary: true,
    available: true,
  },
  {
    id: "marketplace",
    naam: "Marketplace",
    route: "/marketplace",
    icoon: "marketplace",
    permissie: "Beheerder",
    navigatiepositie: 20,
    primary: true,
    available: true,
  },
  {
    id: "partners",
    naam: "Partners",
    route: "/partners",
    icoon: "partners",
    permissie: "Beheerder",
    navigatiepositie: 30,
    primary: true,
    available: true,
  },
  {
    id: "orders",
    naam: "Orders",
    route: "/orders",
    icoon: "orders",
    permissie: "Beheerder",
    navigatiepositie: 40,
    primary: true,
    available: true,
  },
]

export const ADMIN_MORE_NAV: AdminNavItem[] = [
  {
    id: "moderation",
    naam: "Moderatiewachtrij",
    route: "/moderation",
    icoon: "moderation",
    permissie: "Beheerder",
    navigatiepositie: 10,
    primary: false,
    available: true,
  },
  {
    id: "finance",
    naam: "Finance",
    route: null,
    icoon: "finance",
    permissie: "Beheerder",
    navigatiepositie: 20,
    primary: false,
    available: false,
  },
  {
    id: "affiliate",
    naam: "Affiliate",
    route: null,
    icoon: "affiliate",
    permissie: "Beheerder",
    navigatiepositie: 30,
    primary: false,
    available: false,
  },
  {
    id: "reviews",
    naam: "Reviews",
    route: null,
    icoon: "reviews",
    permissie: "Beheerder",
    navigatiepositie: 40,
    primary: false,
    available: false,
  },
  {
    id: "audit",
    naam: "Audit",
    route: null,
    icoon: "audit",
    permissie: "Beheerder",
    navigatiepositie: 50,
    primary: false,
    available: false,
  },
  {
    id: "ai",
    naam: "AI",
    route: null,
    icoon: "ai",
    permissie: "Beheerder",
    navigatiepositie: 60,
    primary: false,
    available: false,
  },
  {
    id: "settings",
    naam: "Instellingen",
    route: null,
    icoon: "settings",
    permissie: "Beheerder",
    navigatiepositie: 70,
    primary: false,
    available: false,
  },
]

/** Compat voor bestaande imports. */
export type AdminModuleContract = {
  naam: string
  route: string
  icoon: string
  permissie: "Beheerder"
  navigatiepositie: number
}

export const ADMIN_MODULES: AdminModuleContract[] = [
  ...ADMIN_PRIMARY_NAV,
  ...ADMIN_MORE_NAV,
]
  .filter((m): m is AdminNavItem & { route: string } => m.route != null)
  .map((m) => ({
    naam: m.naam,
    route: m.route,
    icoon: m.icoon,
    permissie: m.permissie,
    navigatiepositie: m.navigatiepositie,
  }))

export function modulesSorted() {
  return [...ADMIN_MODULES].sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

export function primaryNavSorted() {
  return [...ADMIN_PRIMARY_NAV].sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

export function moreNavSorted() {
  return [...ADMIN_MORE_NAV].sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

export function findActiveNav(pathname: string): AdminNavItem | undefined {
  return [...ADMIN_PRIMARY_NAV, ...ADMIN_MORE_NAV].find(
    (m) =>
      m.route != null &&
      (pathname === m.route || pathname.startsWith(`${m.route}/`))
  )
}
