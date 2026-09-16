import { normalizeGtinDigits } from "./gtin-validation"

export type ExistingProductMatchKind =
  | "ean"
  | "mpn"
  | "own_sku"
  | "title"
  | "brand"

export type ExistingProductMatchCertainty = "exact" | "candidate"

export type ExistingProductSearchHit = {
  product_id: string
  title: string | null
  brand_id: string
  brand_name: string | null
  ean: string | null
  mpn: string | null
  identifier_id: string | null
  category_names: string[]
  primary_image_url: string | null
  own_offer: boolean
  match_kinds: ExistingProductMatchKind[]
  certainty: ExistingProductMatchCertainty
}

export type ExistingProductSearchDraft = Omit<
  ExistingProductSearchHit,
  "certainty"
>

export function normalizeSearchQuery(raw: string): string {
  return raw.replace(/\u00a0/g, " ").trim().replace(/\s+/g, " ")
}

export function searchQueryIsEmpty(raw: string): boolean {
  return normalizeSearchQuery(raw).length === 0
}

export function gtinDigitsFromQuery(raw: string): string | null {
  const digits = normalizeGtinDigits(normalizeSearchQuery(raw))
  return /^\d{8,14}$/.test(digits) ? digits : null
}

export function searchQueryIsTooShort(raw: string): boolean {
  if (searchQueryIsEmpty(raw)) return true
  if (gtinDigitsFromQuery(raw)) return false
  return normalizeSearchQuery(raw).length < 2
}

export function textEqualsInsensitive(a: string, b: string): boolean {
  return normalizeSearchQuery(a).toLowerCase() === normalizeSearchQuery(b).toLowerCase()
}

export function textIncludesInsensitive(haystack: string, needle: string): boolean {
  const q = normalizeSearchQuery(needle).toLowerCase()
  if (!q) return false
  return normalizeSearchQuery(haystack).toLowerCase().includes(q)
}

export function matchKindRank(kind: ExistingProductMatchKind): number {
  switch (kind) {
    case "ean":
      return 0
    case "mpn":
      return 1
    case "own_sku":
      return 2
    case "title":
      return 3
    case "brand":
      return 4
  }
}

export function strongestMatchKind(
  kinds: ExistingProductMatchKind[]
): ExistingProductMatchKind | null {
  if (!kinds.length) return null
  return [...kinds].sort((a, b) => matchKindRank(a) - matchKindRank(b))[0]
}

export function certaintyForKinds(
  kinds: ExistingProductMatchKind[]
): ExistingProductMatchCertainty {
  return kinds.includes("ean") ? "exact" : "candidate"
}

export function mergeSearchDrafts(
  drafts: ExistingProductSearchDraft[]
): ExistingProductSearchHit[] {
  const byId = new Map<string, ExistingProductSearchDraft>()
  for (const draft of drafts) {
    const prev = byId.get(draft.product_id)
    if (!prev) {
      byId.set(draft.product_id, {
        ...draft,
        match_kinds: [...new Set(draft.match_kinds)],
      })
      continue
    }
    byId.set(draft.product_id, {
      ...prev,
      title: prev.title || draft.title,
      brand_id: prev.brand_id || draft.brand_id,
      brand_name: prev.brand_name || draft.brand_name,
      ean: prev.ean || draft.ean,
      mpn: prev.mpn || draft.mpn,
      identifier_id: prev.identifier_id || draft.identifier_id,
      category_names: prev.category_names.length
        ? prev.category_names
        : draft.category_names,
      primary_image_url: prev.primary_image_url || draft.primary_image_url,
      own_offer: prev.own_offer || draft.own_offer,
      match_kinds: [...new Set([...prev.match_kinds, ...draft.match_kinds])],
    })
  }

  return [...byId.values()]
    .map((row) => ({
      ...row,
      certainty: certaintyForKinds(row.match_kinds),
    }))
    .sort((a, b) => {
      const rankA = matchKindRank(strongestMatchKind(a.match_kinds) ?? "brand")
      const rankB = matchKindRank(strongestMatchKind(b.match_kinds) ?? "brand")
      if (rankA !== rankB) return rankA - rankB
      return (a.title || "").localeCompare(b.title || "", "nl")
    })
}

export function paginateSearchHits<T>(
  rows: T[],
  offset: number,
  limit: number
): { items: T[]; count: number; offset: number; limit: number } {
  const safeOffset = Math.max(0, Math.floor(offset) || 0)
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 20))
  return {
    items: rows.slice(safeOffset, safeOffset + safeLimit),
    count: rows.length,
    offset: safeOffset,
    limit: safeLimit,
  }
}

/** SKU is seller-specific: never treat another seller's SKU as identity. */
export function ownSellerSkuMatches(opts: {
  query: string
  sku: string | null | undefined
  offerSellerId: string
  actorSellerId: string
}): boolean {
  if (!opts.sku) return false
  if (opts.offerSellerId !== opts.actorSellerId) return false
  const sku = opts.sku.trim()
  return (
    textEqualsInsensitive(sku, opts.query) ||
    textIncludesInsensitive(sku, opts.query)
  )
}

export function sellerMayManageOffer(
  offerSellerId: string,
  actorSellerId: string
): boolean {
  return offerSellerId === actorSellerId
}

export function selectionCreatesProductCloudRecord(): boolean {
  return false
}

export function repeatedOfferUpsertCreatesDuplicate(opts: {
  existingOwnOffer: boolean
}): boolean {
  return !opts.existingOwnOffer
}

export function isAutomaticIdentityMatch(
  kinds: ExistingProductMatchKind[]
): boolean {
  return strongestMatchKind(kinds) === "ean"
}

export function gtinIsStrongestMatch(kinds: ExistingProductMatchKind[]): boolean {
  return strongestMatchKind(kinds) === "ean"
}
