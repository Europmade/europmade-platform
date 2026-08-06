/**
 * Marketing Center — client-side data-laag.
 * Geen demo-data. Ontbrekende backend → unavailable.
 */

import type {
  AffiliateCommissionSettings,
  BannerCampaign,
  MarketingBillingLine,
  SponsoredProductPlacement,
} from "./types"

export type MarketingDataResult<T> = {
  available: boolean
  data: T
  note: string | null
}

const UNAVAILABLE = "Nog niet beschikbaar"

/**
 * Bannercampagnes — advertentieplatform-API bestaat nog niet.
 */
export async function listBannerCampaigns(): Promise<
  MarketingDataResult<BannerCampaign[]>
> {
  return {
    available: false,
    data: [],
    note: UNAVAILABLE,
  }
}

/**
 * Sponsored Products — geen seller-API.
 */
export async function listSponsoredProducts(): Promise<
  MarketingDataResult<SponsoredProductPlacement[]>
> {
  return {
    available: false,
    data: [],
    note: UNAVAILABLE,
  }
}

/**
 * Affiliate-commissie-instellingen voor sellers — nog geen opslag-API.
 * Lege structuur voor UI; geen defaults verzinnen.
 */
export async function getAffiliateCommissionSettings(): Promise<
  MarketingDataResult<AffiliateCommissionSettings>
> {
  return {
    available: false,
    data: {
      default_commission_percent: null,
      category_commissions: [],
      product_commissions: [],
    },
    note: UNAVAILABLE,
  }
}

/**
 * Maandfacturatie marketing — geen facturatie-API voor marketingdiensten.
 */
export async function listMarketingBillingLines(): Promise<
  MarketingDataResult<MarketingBillingLine[]>
> {
  return {
    available: false,
    data: [],
    note: UNAVAILABLE,
  }
}
