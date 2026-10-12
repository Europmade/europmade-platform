import {
  commissionPercentLabel,
  emptyAffiliatePreferences,
  planAffiliateLocale,
  planAffiliatePreferences,
  planPartnerType,
  planSocialChannels,
} from "../affiliate-profile"

describe("affiliate communication profile", () => {
  it("keeps partner type, preferences and social channels on the existing affiliate", () => {
    expect(planPartnerType("influencer")).toBe("influencer")
    expect(() => planPartnerType("willekeurig")).toThrow(/partnertype/)
    expect(planAffiliateLocale("en-GB")).toBe("en")
    expect(planSocialChannels([{ channel: "instagram", url: "@europmade" }])).toEqual([
      { channel: "instagram", url: "@europmade" },
    ])
    expect(() => planSocialChannels([{ channel: "snapchat", url: "x" }])).toThrow(/niet beschikbaar/)
    const preferences = planAffiliatePreferences({
      ...emptyAffiliatePreferences(),
      affiliate_news: true,
    })
    expect(preferences.affiliate_news).toBe(true)
    expect(preferences.affiliate_campaigns).toBe(false)
  })

  it("shows a commission percentage only when the setting exists", () => {
    expect(commissionPercentLabel(0.05)).toBe("5%")
    expect(commissionPercentLabel(null)).toBeNull()
    expect(commissionPercentLabel(0)).toBeNull()
  })
})
