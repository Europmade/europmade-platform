import {
  SELLER_AFFILIATE_COMMISSION_SETTINGS,
  sellerAffiliateCommission,
  type SellerAffiliateCommissionSettings,
} from "@europmade/utils"

/**
 * Commissie van één seller voor één product.
 * Productregel van die seller, anders de standaard van die seller, plus de EuropMade-bijdrage.
 * Een lege instelling gebruikt de bestaande standaard (8% + 3%) en geen algemene productlijst.
 */
export function normalizeSellerCommissionSettings(
  raw: unknown
): SellerAffiliateCommissionSettings {
  if (!raw || typeof raw !== "object") {
    return {
      default_commission_percent:
        SELLER_AFFILIATE_COMMISSION_SETTINGS.default_commission_percent,
      product_commissions: [],
    }
  }
  const record = raw as {
    default_commission_percent?: unknown
    product_commissions?: unknown
  }
  const fallback = SELLER_AFFILIATE_COMMISSION_SETTINGS.default_commission_percent
  const defaultPercent =
    typeof record.default_commission_percent === "number" &&
    Number.isFinite(record.default_commission_percent)
      ? record.default_commission_percent
      : fallback
  const rows = Array.isArray(record.product_commissions)
    ? record.product_commissions.flatMap((row) => {
        if (!row || typeof row !== "object") return []
        const item = row as {
          product_id?: unknown
          product_title?: unknown
          commission_percent?: unknown
        }
        if (typeof item.product_id !== "string" || !item.product_id.trim()) return []
        if (typeof item.commission_percent !== "number" || !Number.isFinite(item.commission_percent)) {
          return []
        }
        return [
          {
            product_id: item.product_id.trim(),
            product_title: typeof item.product_title === "string" ? item.product_title : "",
            commission_percent: item.commission_percent,
          },
        ]
      })
    : []
  return {
    default_commission_percent: defaultPercent,
    product_commissions: rows,
  }
}

export function commissionForSellerProduct(raw: unknown, productId: string) {
  return sellerAffiliateCommission({
    settings: normalizeSellerCommissionSettings(raw),
    productId,
  })
}

export type AffiliateSaleLine = {
  offerId: string
  sellerId: string
  productId: string
  subtotal: number
}

/**
 * Commissie van de seller die de regel echt verkocht.
 * Een landingsaanbieding hoort hier niet in: die bepaalt niet wie betaalt.
 */
export function affiliateSaleCommissions(input: {
  lines: AffiliateSaleLine[]
  referredProductId?: string | null
  rateFor: (sellerId: string, productId: string) => number
}): Array<{
  offer_id: string
  seller_id: string
  product_id: string
  percent_points: number
  percentage: number
  amount: number
}> {
  const referred = input.referredProductId?.trim() || ""
  const grouped = new Map<string, AffiliateSaleLine>()
  for (const line of input.lines) {
    if (referred && line.productId !== referred) continue
    if (!line.offerId || !line.sellerId) continue
    if (!Number.isFinite(line.subtotal) || line.subtotal <= 0) continue
    const current = grouped.get(line.offerId)
    if (current) current.subtotal += line.subtotal
    else grouped.set(line.offerId, { ...line })
  }
  const rows = []
  for (const line of grouped.values()) {
    const points = input.rateFor(line.sellerId, line.productId)
    const percentage = Math.round((points / 100) * 10000) / 10000
    const amount = Math.round(line.subtotal * (points / 100) * 100) / 100
    if (amount <= 0) continue
    rows.push({
      offer_id: line.offerId,
      seller_id: line.sellerId,
      product_id: line.productId,
      percent_points: points,
      percentage,
      amount,
    })
  }
  return rows
}
