import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import Review from "./models/review"

export type ReviewType = "Productreview" | "Verkopersreview"

/**
 * Review-module — Blueprint E.1 + ADR-0027.
 */
class ReviewModuleService extends MedusaService({
  Review,
}) {
  /**
   * Gemiddelde verkopersreview per seller, genormaliseerd 0–1 (`avg / 5`).
   * Ontbrekende sellers → null (Buy Box gebruikt neutraal 0,5).
   */
  async getSellerReviewScores01(
    sellerIds: string[]
  ): Promise<Record<string, number | null>> {
    const out: Record<string, number | null> = {}
    for (const id of sellerIds) {
      out[id] = null
    }
    if (sellerIds.length === 0) return out

    const rows = await this.listReviews(
      {
        seller_id: sellerIds,
        review_type: "Verkopersreview",
      },
      { take: 10_000 }
    )

    const sums: Record<string, { total: number; count: number }> = {}
    for (const row of rows) {
      if (!row.seller_id) continue
      const bucket = sums[row.seller_id] ?? { total: 0, count: 0 }
      bucket.total += Number(row.score)
      bucket.count += 1
      sums[row.seller_id] = bucket
    }
    for (const [sellerId, agg] of Object.entries(sums)) {
      if (agg.count === 0) continue
      out[sellerId] = agg.total / agg.count / 5
    }
    return out
  }

  async averageSellerScoreRaw(sellerId: string): Promise<{
    average: number | null
    count: number
  }> {
    const rows = await this.listReviews(
      { seller_id: sellerId, review_type: "Verkopersreview" },
      { take: 10_000 }
    )
    if (rows.length === 0) return { average: null, count: 0 }
    const total = rows.reduce((s, r) => s + Number(r.score), 0)
    return { average: total / rows.length, count: rows.length }
  }

  assertScore(score: number): void {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "score moet een geheel getal van 1 tot 5 zijn."
      )
    }
  }
}

export default ReviewModuleService
