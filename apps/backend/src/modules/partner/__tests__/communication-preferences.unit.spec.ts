import { planSellerCommunicationPreferences } from "../communication-preferences"

describe("seller communication preferences", () => {
  it("stores only the five voluntary flags on the seller", () => {
    expect(
      planSellerCommunicationPreferences({
        platform_updates: true,
        seller_tips: false,
        product_opportunities: true,
        seller_campaigns: false,
        europmade_news: true,
        nieuwe_bestelling: false,
      })
    ).toEqual({
      platform_updates: true,
      seller_tips: false,
      product_opportunities: true,
      seller_campaigns: false,
      europmade_news: true,
    })
  })

  it("rejects a partial preference payload", () => {
    expect(() => planSellerCommunicationPreferences({ platform_updates: true })).toThrow(
      /onvolledig/
    )
  })
})
