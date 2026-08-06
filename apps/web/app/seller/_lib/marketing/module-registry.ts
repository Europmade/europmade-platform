/**
 * Marketing Center — modulaire module-registry.
 * Actieve MVP-modules + uitbreidpunten voor latere kanalen.
 */

export type MarketingModuleStatus = "available" | "prepared" | "unavailable"

export type MarketingModuleDefinition = {
  id: string
  title: string
  description: string
  href: string | null
  status: MarketingModuleStatus
  /** MVP = zichtbaar in hub; extension = alleen registry-slot. */
  kind: "mvp" | "extension"
  navigatiepositie: number
}

export const MARKETING_MODULES: MarketingModuleDefinition[] = [
  {
    id: "banner_campaigns",
    title: "Banner Campagnes",
    description: "Beheer banners voor homepage, categorie, zoek en product.",
    href: "/seller/marketing/banners",
    status: "available",
    kind: "mvp",
    navigatiepositie: 10,
  },
  {
    id: "sponsored_products",
    title: "Sponsored Products",
    description: "Campagnes met CPC, budget en looptijd.",
    href: "/seller/marketing/sponsored",
    status: "available",
    kind: "mvp",
    navigatiepositie: 20,
  },
  {
    id: "affiliate_program",
    title: "Affiliate Programma",
    description: "Stel commissies in op standaard-, categorie- en productniveau.",
    href: "/seller/marketing/affiliate",
    status: "available",
    kind: "mvp",
    navigatiepositie: 30,
  },
  {
    id: "monthly_billing",
    title: "Marketing Facturen",
    description: "Openstaande en betaalde marketingkosten.",
    href: "/seller/marketing/billing",
    status: "available",
    kind: "mvp",
    navigatiepositie: 40,
  },
  // Uitbreidpunten — nog geen UI-routes.
  {
    id: "ai_marketing",
    title: "AI Marketing",
    description: "AI-ondersteunde campagnes (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 100,
  },
  {
    id: "coupons",
    title: "Coupons",
    description: "Kortingscoupons (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 110,
  },
  {
    id: "promotions",
    title: "Kortingsacties",
    description: "Tijdelijke kortingsacties (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 120,
  },
  {
    id: "newsletters",
    title: "Nieuwsbrieven",
    description: "E-mailcampagnes (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 130,
  },
  {
    id: "social_campaigns",
    title: "Social campagnes",
    description: "Sociale mediocampagnes (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 140,
  },
  {
    id: "google_ads",
    title: "Google Ads",
    description: "Google Ads-integratie (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 150,
  },
  {
    id: "meta_ads",
    title: "Meta Ads",
    description: "Meta Ads-integratie (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 160,
  },
  {
    id: "tiktok_ads",
    title: "TikTok Ads",
    description: "TikTok Ads-integratie (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 170,
  },
  {
    id: "pinterest_ads",
    title: "Pinterest Ads",
    description: "Pinterest Ads-integratie (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 180,
  },
  {
    id: "influencers",
    title: "Influencers",
    description: "Influencer-campagnes (toekomst).",
    href: null,
    status: "prepared",
    kind: "extension",
    navigatiepositie: 190,
  },
  {
    id: "affiliate_campaigns",
    title: "Affiliate campagnes",
    description: "Gerichte affiliate-campagnes (toekomst).",
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
