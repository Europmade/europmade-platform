/**
 * Pure Buy Box-scorelogica — server-side only (ADR-0005).
 * Factoren/prioriteit: ADR-0001; tiebreakers: ADR-0004; defaults: ADR-0019.
 */

import { createHash } from "node:crypto"

export type BuyBoxWeights = {
  price: number
  delivery: number
  seller_review: number
  stock: number
  performance: number
  returns: number
}

/** ADR-0019 defaults — som = 1.0 */
export const DEFAULT_BUY_BOX_WEIGHTS: BuyBoxWeights = {
  price: 0.4,
  delivery: 0.2,
  seller_review: 0.15,
  stock: 0.12,
  performance: 0.08,
  returns: 0.05,
}

export type BuyBoxOfferInput = {
  offer_id: string
  seller_id: string
  quantity_available: number
  base_price: number
  shipping_cost: number
  /** 0–1; ontbrekend → neutraal 0.5 (ADR-0019) */
  delivery_score?: number | null
  seller_review_score?: number | null
  performance_score?: number | null
  returns_score?: number | null
  /** Voor tiebreaker 2 — epoch ms; null = onbekend */
  seller_tenure_at_ms?: number | null
}

export type BuyBoxRankedOffer = {
  offer_id: string
  seller_id: string
  total_price: number
  quantity_available: number
  score: number
  factor_scores: {
    price: number
    delivery: number
    seller_review: number
    stock: number
    performance: number
    returns: number
  }
  rank: number
  is_winner: boolean
}

export type BuyBoxComputationResult = {
  identifier_id: string
  region_code: string
  winning_offer_id: string | null
  ranked: BuyBoxRankedOffer[]
  weights: BuyBoxWeights
  computed_at: Date
}

const NEUTRAL = 0.5

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function normalizeHigherBetter(values: number[]): number[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 1)
  return values.map((v) => (v - min) / (max - min))
}

function normalizeLowerBetter(values: number[]): number[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 1)
  return values.map((v) => 1 - (v - min) / (max - min))
}

function assertWeights(weights: BuyBoxWeights): void {
  const sum =
    weights.price +
    weights.delivery +
    weights.seller_review +
    weights.stock +
    weights.performance +
    weights.returns
  if (Math.abs(sum - 1) > 0.0001) {
    throw new Error(`Buy Box-weging moet optellen tot 1.0 (nu ${sum}).`)
  }
  for (const [k, v] of Object.entries(weights) as Array<
    [keyof BuyBoxWeights, number]
  >) {
    if (v < 0 || v > 1) {
      throw new Error(`Buy Box-weging ${k} buiten [0,1]: ${v}`)
    }
  }
}

function rotationKey(
  identifierId: string,
  regionCode: string,
  offerId: string,
  at: Date
): string {
  const day = Math.floor(at.getTime() / 86_400_000)
  return createHash("sha256")
    .update(`${identifierId}|${regionCode}|${day}|${offerId}`)
    .digest("hex")
}

/**
 * Rangschik in-stock offers; retourneer winnaar + volledige ranking.
 */
export function computeBuyBoxRanking(input: {
  identifier_id: string
  region_code: string
  offers: BuyBoxOfferInput[]
  weights?: BuyBoxWeights
  computed_at?: Date
}): BuyBoxComputationResult {
  const weights = input.weights ?? DEFAULT_BUY_BOX_WEIGHTS
  assertWeights(weights)
  const computed_at = input.computed_at ?? new Date()
  const region = input.region_code.trim().toUpperCase()

  const eligible = input.offers.filter((o) => o.quantity_available > 0)
  if (eligible.length === 0) {
    return {
      identifier_id: input.identifier_id,
      region_code: region,
      winning_offer_id: null,
      ranked: [],
      weights,
      computed_at,
    }
  }

  const totals = eligible.map((o) => o.base_price + o.shipping_cost)
  const priceScores = normalizeLowerBetter(totals)
  const stockScores = normalizeHigherBetter(
    eligible.map((o) => o.quantity_available)
  )

  const scored = eligible.map((o, i) => {
    const factor_scores = {
      price: priceScores[i],
      delivery: clamp01(o.delivery_score ?? NEUTRAL),
      seller_review: clamp01(o.seller_review_score ?? NEUTRAL),
      stock: stockScores[i],
      performance: clamp01(o.performance_score ?? NEUTRAL),
      returns: clamp01(o.returns_score ?? NEUTRAL),
    }
    const score =
      factor_scores.price * weights.price +
      factor_scores.delivery * weights.delivery +
      factor_scores.seller_review * weights.seller_review +
      factor_scores.stock * weights.stock +
      factor_scores.performance * weights.performance +
      factor_scores.returns * weights.returns

    return {
      offer: o,
      total_price: totals[i],
      score,
      factor_scores,
    }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score

    // ADR-0004 tiebreaker 1 — performance
    const perfA = a.offer.performance_score
    const perfB = b.offer.performance_score
    if (
      perfA != null &&
      perfB != null &&
      Number.isFinite(perfA) &&
      Number.isFinite(perfB) &&
      perfA !== perfB
    ) {
      return perfB - perfA
    }

    // ADR-0004 tiebreaker 2 — langste positieve tenure
    const tenA = a.offer.seller_tenure_at_ms
    const tenB = b.offer.seller_tenure_at_ms
    if (tenA != null && tenB != null && tenA !== tenB) {
      return tenA - tenB
    }
    if (tenA != null && tenB == null) return -1
    if (tenA == null && tenB != null) return 1

    // ADR-0004 tiebreaker 3 — fair daily rotation
    const rotA = rotationKey(
      input.identifier_id,
      region,
      a.offer.offer_id,
      computed_at
    )
    const rotB = rotationKey(
      input.identifier_id,
      region,
      b.offer.offer_id,
      computed_at
    )
    return rotA < rotB ? -1 : rotA > rotB ? 1 : 0
  })

  const ranked: BuyBoxRankedOffer[] = scored.map((s, index) => ({
    offer_id: s.offer.offer_id,
    seller_id: s.offer.seller_id,
    total_price: s.total_price,
    quantity_available: s.offer.quantity_available,
    score: s.score,
    factor_scores: s.factor_scores,
    rank: index + 1,
    is_winner: index === 0,
  }))

  return {
    identifier_id: input.identifier_id,
    region_code: region,
    winning_offer_id: ranked[0]?.offer_id ?? null,
    ranked,
    weights,
    computed_at,
  }
}
