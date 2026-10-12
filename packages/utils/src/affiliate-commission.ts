/**
 * Same affiliate commission as Seller → Marketing → Affiliate.
 * Product rate, otherwise the seller default, plus the EuropMade contribution.
 * Rates are percent points (12 means 12%), not fractions.
 */

export const EUROPMADE_AFFILIATE_CONTRIBUTION_PERCENT = 3

export type SellerAffiliateCommissionSettings = {
  default_commission_percent: number | null
  product_commissions: Array<{
    product_id: string
    product_title: string
    commission_percent: number
  }>
}

/** Values shown in Seller Settings. Do not change these rates here. */
export const SELLER_AFFILIATE_COMMISSION_SETTINGS: SellerAffiliateCommissionSettings =
  {
    default_commission_percent: 8,
    product_commissions: [
      {
        product_id: "prod_01",
        product_title: "Noordzee Olijfolie Extra Vierge 500 ml",
        commission_percent: 12,
      },
      {
        product_id: "prod_06",
        product_title: "Zeeuwse Mosselpan Gietijzer 28 cm",
        commission_percent: 9,
      },
    ],
  }

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

export function sellerAffiliateCommission(input: {
  settings?: SellerAffiliateCommissionSettings
  productId?: string | null
  productTitle?: string | null
}): {
  sellerPercent: number
  contributionPercent: number
  totalPercent: number
} {
  const settings = input.settings ?? SELLER_AFFILIATE_COMMISSION_SETTINGS
  const productId = input.productId?.trim() || ""
  const title = norm(input.productTitle)
  const hit = settings.product_commissions.find((row) => {
    if (productId && row.product_id === productId) return true
    const rowTitle = norm(row.product_title)
    return Boolean(title) && rowTitle === title
  })
  const sellerPercent = hit
    ? hit.commission_percent
    : (settings.default_commission_percent ?? 0)
  const contributionPercent = EUROPMADE_AFFILIATE_CONTRIBUTION_PERCENT
  return {
    sellerPercent,
    contributionPercent,
    totalPercent: sellerPercent + contributionPercent,
  }
}

export function formatAffiliateCommissionPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`
}
