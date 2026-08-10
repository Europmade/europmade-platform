/**
 * Marketing Center — modulaire module-registry.
 * Actieve MVP-modules + uitbreidpunten voor latere kanalen.
 */

import type { StorefrontMessageKey } from "../../../_lib/i18n/messages"

export type MarketingModuleStatus = "available" | "prepared" | "unavailable"

export type MarketingModuleDefinition = {
  id: string
  titleKey: StorefrontMessageKey
  descriptionKey: StorefrontMessageKey
  href: string | null
  status: MarketingModuleStatus
  /** MVP = zichtbaar in hub; extension = alleen registry-slot. */
  kind: "mvp" | "extension"
  navigatiepositie: number
}

export const MARKETING_MODULES: MarketingModuleDefinition[] = [
  {
    id: "banner_campaigns",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: "/seller/marketing/banners",
    status: "available",
    kind: "mvp",
    navigatiepositie: 10,
  },
  {
    id: "sponsored_products",
    titleKey: "sellerMktSponsoredTitle",
    descriptionKey: "sellerMktSponsoredDesc",
    href: "/seller/marketing/sponsored",
    status: "available",
    kind: "mvp",
    navigatiepositie: 20,
  },
  {
    id: "affiliate_program",
    titleKey: "sellerMktAffiliateTitle",
    descriptionKey: "sellerMktAffiliateDesc",
    href: "/seller/marketing/affiliate",
    status: "available",
    kind: "mvp",
    navigatiepositie: 30,
  },
  {
    id: "monthly_billing",
    titleKey: "sellerMktBillingTitle",
    descriptionKey: "sellerMktBillingDesc",
    href: "/seller/marketing/billing",
    status: "available",
    kind: "mvp",
    navigatiepositie: 40,
  },
  // Uitbreidpunten — nog geen UI-routes (titles kept for registry slots only).
  {
    id: "ai_marketing",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 100,
  },
  {
    id: "coupons",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 110,
  },
  {
    id: "promotions",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 120,
  },
  {
    id: "newsletters",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 130,
  },
  {
    id: "social_campaigns",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 140,
  },
  {
    id: "google_ads",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 150,
  },
  {
    id: "meta_ads",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 160,
  },
  {
    id: "tiktok_ads",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 170,
  },
  {
    id: "pinterest_ads",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 180,
  },
  {
    id: "influencers",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 190,
  },
  {
    id: "affiliate_campaigns",
    titleKey: "sellerMktBannerTitle",
    descriptionKey: "sellerMktBannerDesc",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 200,
  },
]

export function mvpMarketingModules() {
  return MARKETING_MODULES.filter((m) => m.kind === "mvp").sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}

export function extensionMarketingModules() {
  return MARKETING_MODULES.filter((m) => m.kind === "extension").sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie
  )
}
