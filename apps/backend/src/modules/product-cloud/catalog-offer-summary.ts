/**
 * Splits central products from seller offers for Admin lists.
 * One product stays one catalog row, even when several sellers offer it.
 */

export type CatalogOfferLink = {
  product_id: string
  offer_id: string
  seller_id: string
  region_code: string
}

export type CatalogOfferStat = {
  offer_count: number
  seller_count: number
}

export function catalogOfferStats(
  productIds: string[],
  links: CatalogOfferLink[]
): Map<string, CatalogOfferStat> {
  const stats = new Map<string, CatalogOfferStat>()
  const sellers = new Map<string, Set<string>>()
  for (const id of productIds) {
    stats.set(id, { offer_count: 0, seller_count: 0 })
    sellers.set(id, new Set())
  }
  for (const link of links) {
    const row = stats.get(link.product_id)
    if (!row) continue
    row.offer_count += 1
    sellers.get(link.product_id)?.add(link.seller_id)
  }
  for (const [id, row] of stats) {
    row.seller_count = sellers.get(id)?.size || 0
  }
  return stats
}

export function offerListRows<T extends CatalogOfferLink>(links: T[]): T[] {
  return links
}

export function offerPresence(
  stat: CatalogOfferStat | undefined
): "none" | "single" | "multi" {
  const count = stat?.offer_count || 0
  if (count <= 0) return "none"
  if (count === 1) return "single"
  return "multi"
}

/** Exact offer count. Seller count is never used as a stand-in. */
export function offerCountLabel(count: number | undefined): string {
  const n = Math.max(0, count || 0)
  if (n === 0) return "0"
  if (n === 1) return "1 offer"
  return `${n} offers`
}
