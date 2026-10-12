import { emptyNewsletterTopics, resolveNewsletterTopics } from "../consumer-rules"
import {
  marketingPreferenceKey,
  planPreferenceAudits,
} from "../preference-audit"

describe("preference audit", () => {
  it("records only an explicit change and keeps personal data out of the log", () => {
    const rows = planPreferenceAudits({
      audience: "consumers",
      entityId: "econ_1",
      actorCustomerId: null,
      before: emptyNewsletterTopics(),
      after: { news: true, brands: false, offers: true },
    })
    expect(rows.map((row) => `${row.action_type}:${row.reason}`)).toEqual([
      "consumers.news:ingeschakeld",
      "consumers.offers:ingeschakeld",
    ])
    expect(rows.every((row) => row.entity_type === "communication_preference")).toBe(true)
    expect(JSON.stringify(rows)).not.toMatch(/@/)

    const again = planPreferenceAudits({
      audience: "sellers",
      entityId: "seller_1",
      before: { europmade_news: false, seller_campaigns: false },
      after: { europmade_news: false, seller_campaigns: false },
    })
    expect(again).toEqual([])
  })

  it("does not turn a stored opt-out or a missing seller choice into consent", () => {
    expect(resolveNewsletterTopics(null, true)).toEqual({ news: true, brands: true, offers: true })
    expect(resolveNewsletterTopics({ news: false, brands: false, offers: false }, true)).toEqual(
      emptyNewsletterTopics()
    )
    expect(resolveNewsletterTopics({ news: true, brands: true, offers: true }, false)).toEqual(
      emptyNewsletterTopics()
    )
    expect(marketingPreferenceKey("sellers", "campaign", null)).toBe("seller_campaigns")
    expect(marketingPreferenceKey("sellers", "newsletter", "category_three_brands")).toBe(
      "product_opportunities"
    )
    expect(marketingPreferenceKey("affiliates", "newsletter", null)).toBe("affiliate_news")
    expect(marketingPreferenceKey("consumers", "campaign", "offer_published")).toBe("offers")
    expect(marketingPreferenceKey("sellers", "onboarding", null)).not.toBe("seller_campaigns")
  })
})
