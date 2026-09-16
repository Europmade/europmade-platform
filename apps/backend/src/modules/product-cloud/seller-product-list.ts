export function unionSellerListProductIds(
  ownedProductIds: string[],
  offerProductIds: string[]
): string[] {
  return [...new Set([...ownedProductIds, ...offerProductIds])]
}

export function workingPublicationMatchesListFilter(
  publicationStatus: string | null | undefined,
  filter: string | undefined
): boolean {
  const pub = publicationStatus || "Concept"
  if (filter === "pending_approval") return pub === "In review"
  if (filter === "published") return pub === "Gepubliceerd"
  if (filter === "unpublished") return pub !== "Gepubliceerd"
  return true
}

export function sellerListRowIsRelevant(opts: {
  currentOwnerSellerId: string
  actorSellerId: string
  hasOwnOffer: boolean
}): boolean {
  return (
    opts.currentOwnerSellerId === opts.actorSellerId || opts.hasOwnOffer
  )
}

export function activityTimestampMs(value: string | Date | null | undefined): number {
  if (!value) return 0
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value))
  return Number.isFinite(ms) ? ms : 0
}

export function latestActivityIso(
  values: Array<string | Date | null | undefined>
): string | null {
  let best = 0
  let iso: string | null = null
  for (const value of values) {
    const ms = activityTimestampMs(value)
    if (ms > best) {
      best = ms
      iso =
        value instanceof Date ? value.toISOString() : String(value)
    }
  }
  return iso
}

export function sortSellerListNewest<T extends {
  id: string
  list_activity_at?: string | null
}>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const tb = activityTimestampMs(b.list_activity_at)
    const ta = activityTimestampMs(a.list_activity_at)
    if (tb !== ta) return tb - ta
    return b.id.localeCompare(a.id)
  })
}

export function sellerListRowMatchesQuery(
  row: {
    title?: string | null
    brand_name?: string | null
    brand_id?: string | null
    identifier_value?: string | null
    offer?: { seller_sku?: string | null }
    offers?: { sku_display?: string | null }
    sku_hint?: string | null
    category_names?: string[]
    id?: string
  },
  q: string
): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [
    row.title,
    row.identifier_value,
    row.id,
    row.brand_id,
    row.brand_name,
    row.offer?.seller_sku,
    row.offers?.sku_display,
    row.sku_hint,
    ...(row.category_names || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return hay.includes(needle)
}

export function ownOfferFields(opts: {
  actorSellerId: string
  offerSellerId: string | null
  price: number | null
  stock: number | null
  sku: string | null
}): { price: number | null; stock: number | null; sku: string | null } {
  if (!opts.offerSellerId || opts.offerSellerId !== opts.actorSellerId) {
    return { price: null, stock: null, sku: null }
  }
  return { price: opts.price, stock: opts.stock, sku: opts.sku }
}
