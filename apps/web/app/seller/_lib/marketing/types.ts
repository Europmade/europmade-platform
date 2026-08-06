/**
 * Marketing Center — voorbereide datamodellen (geen opslag / geen API-koppeling).
 */

export type BannerLocation =
  | "homepage"
  | "category"
  | "search"
  | "product"
  | "temporary"

export type BannerCampaignStatus =
  | "Concept"
  | "Gepland"
  | "Actief"
  | "Afgerond"
  | "Gepauzeerd"

export type InvoiceLineStatus =
  | "Nog te factureren"
  | "Gefactureerd"
  | "Betaald"

export type BannerCampaign = {
  id: string
  name: string
  status: BannerCampaignStatus
  location: BannerLocation
  starts_at: string | null
  ends_at: string | null
  cost: number | null
  invoice_status: InvoiceLineStatus | null
}

export type SponsoredProductPlacement = {
  id: string
  product_id: string
  product_title: string
  status: string
  daily_budget: number | null
}

/** Commissieprioriteit: product → categorie → standaard. */
export type AffiliateCommissionSettings = {
  default_commission_percent: number | null
  category_commissions: Array<{
    category_id: string
    category_name: string
    commission_percent: number
  }>
  product_commissions: Array<{
    product_id: string
    product_title: string
    commission_percent: number
  }>
}

export type MarketingBillingLineType =
  | "banner_campaigns"
  | "sponsored_products"
  | "affiliate_commissions"
  | "ai_marketing"
  | "premium_options"

export type MarketingBillingLine = {
  id: string
  type: MarketingBillingLineType
  description: string
  amount: number
  status: InvoiceLineStatus
  period_key: string
}

export const BANNER_LOCATION_LABELS: Record<BannerLocation, string> = {
  homepage: "Homepage Hero",
  category: "Categoriepagina",
  search: "Zoekresultaat",
  product: "Productpagina",
  temporary: "Tijdelijke campagnes",
}

export const BILLING_LINE_TYPE_LABELS: Record<
  MarketingBillingLineType,
  string
> = {
  banner_campaigns: "Bannercampagnes",
  sponsored_products: "Sponsored Products",
  affiliate_commissions: "Affiliate commissies",
  ai_marketing: "AI Marketing",
  premium_options: "Premium opties",
}

/** Resolveer effectieve commissie: product > categorie > standaard. */
export function resolveAffiliateCommission(
  settings: AffiliateCommissionSettings,
  opts: { productId?: string; categoryId?: string }
): { percent: number | null; source: "product" | "category" | "default" | null } {
  if (opts.productId) {
    const hit = settings.product_commissions.find(
      (p) => p.product_id === opts.productId
    )
    if (hit) return { percent: hit.commission_percent, source: "product" }
  }
  if (opts.categoryId) {
    const hit = settings.category_commissions.find(
      (c) => c.category_id === opts.categoryId
    )
    if (hit) return { percent: hit.commission_percent, source: "category" }
  }
  if (settings.default_commission_percent != null) {
    return {
      percent: settings.default_commission_percent,
      source: "default",
    }
  }
  return { percent: null, source: null }
}
