/**
 * Seller Dashboard — navigatie via modulecontract (spiegel Admin Shell-patroon).
 * Volgorde is vastgelegd voor Seller Dashboard MVP.
 */

import type { StorefrontMessageKey } from "../../_lib/i18n/messages"

export type SellerNavItem = {
  id: string
  /** NL fallback for any code that still reads `naam`. */
  naam: string
  labelKey: StorefrontMessageKey
  route: string | null
  navigatiepositie: number
  primary: boolean
  available: boolean
}

/** Exacte MVP-volgorde — niet wijzigen. */
export const SELLER_PRIMARY_NAV: SellerNavItem[] = [
  {
    id: "dashboard",
    naam: "Dashboard",
    labelKey: "sellerNavDashboard",
    route: "/seller",
    navigatiepositie: 10,
    primary: true,
    available: true,
  },
  {
    id: "products",
    naam: "Producten",
    labelKey: "sellerNavProducts",
    route: "/seller/products",
    navigatiepositie: 20,
    primary: true,
    available: true,
  },
  {
    id: "brands",
    naam: "Merken",
    labelKey: "sellerNavBrands",
    route: "/seller/brands",
    navigatiepositie: 25,
    primary: true,
    available: true,
  },
  {
    id: "made-in-europe",
    naam: "Made in Europe",
    labelKey: "sellerNavMadeInEurope",
    route: "/seller/made-in-europe",
    navigatiepositie: 27,
    primary: true,
    available: true,
  },
  {
    id: "orders",
    naam: "Orders",
    labelKey: "sellerNavOrders",
    route: "/seller/orders",
    navigatiepositie: 30,
    primary: true,
    available: true,
  },
  {
    id: "messages",
    naam: "Berichten",
    labelKey: "sellerNavMessages",
    route: "/seller/messages",
    navigatiepositie: 40,
    primary: true,
    available: true,
  },
  {
    id: "returns",
    naam: "Retouren",
    labelKey: "sellerNavReturns",
    route: "/seller/returns",
    navigatiepositie: 50,
    primary: true,
    available: true,
  },
  {
    id: "marketing",
    naam: "Marketing",
    labelKey: "sellerNavMarketing",
    route: "/seller/marketing",
    navigatiepositie: 60,
    primary: true,
    available: true,
  },
  {
    id: "finance",
    naam: "Financiën",
    labelKey: "sellerNavFinance",
    route: "/seller/finance",
    navigatiepositie: 70,
    primary: true,
    available: true,
  },
  {
    id: "reviews",
    naam: "Reviews",
    labelKey: "sellerNavReviews",
    route: "/seller/reviews",
    navigatiepositie: 80,
    primary: true,
    available: true,
  },
  {
    id: "settings",
    naam: "Instellingen",
    labelKey: "sellerNavSettings",
    route: "/seller/settings",
    navigatiepositie: 90,
    primary: true,
    available: true,
  },
]

/** Geen secundaire navigatie meer — alles staat in primaire MVP-nav. */
export const SELLER_SECONDARY_NAV: SellerNavItem[] = []

export function primaryNavSorted() {
  return [...SELLER_PRIMARY_NAV].sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

export function secondaryNavSorted() {
  return [...SELLER_SECONDARY_NAV].sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

export function findActiveSellerNav(
  pathname: string
): SellerNavItem | undefined {
  const all = [...SELLER_PRIMARY_NAV, ...SELLER_SECONDARY_NAV]
  const matches = all.filter(
    (m) =>
      m.route != null &&
      (pathname === m.route ||
        (m.route !== "/seller" && pathname.startsWith(`${m.route}/`)))
  )
  return matches.sort(
    (a, b) => (b.route?.length ?? 0) - (a.route?.length ?? 0)
  )[0]
}
