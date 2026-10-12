import {
  affiliateSaleCommissions,
  commissionForSellerProduct,
} from "../offer-commission"

describe("affiliate offer commission", () => {
  it("uses the seller default plus the EuropMade contribution when no product rate is stored", () => {
    const rated = commissionForSellerProduct(null, "prod_bosch")
    expect(rated.sellerPercent).toBe(8)
    expect(rated.totalPercent).toBe(11)
  })

  it("prefers that seller's product rate over the default", () => {
    const rated = commissionForSellerProduct(
      {
        default_commission_percent: 8,
        product_commissions: [
          {
            product_id: "prod_dt1990",
            product_title: "beyerdynamic DT 1990",
            commission_percent: 5,
          },
        ],
      },
      "prod_dt1990"
    )
    expect(rated.sellerPercent).toBe(5)
    expect(rated.totalPercent).toBe(8)
  })

  it("does not apply another seller's product title to this offer", () => {
    const rated = commissionForSellerProduct(null, "prod_01")
    expect(rated.totalPercent).toBe(11)
  })

  it("keeps sellers independent", () => {
    const sellerA = commissionForSellerProduct(
      {
        default_commission_percent: 8,
        product_commissions: [
          {
            product_id: "prod_shared",
            product_title: "Gedeeld",
            commission_percent: 12,
          },
        ],
      },
      "prod_shared"
    )
    const sellerB = commissionForSellerProduct(
      { default_commission_percent: 8, product_commissions: [] },
      "prod_shared"
    )
    expect(sellerA.totalPercent).toBe(15)
    expect(sellerB.totalPercent).toBe(11)
  })

  it("charges the seller who sold the product, not the landing seller", () => {
    const rates = new Map<string, { defaultPercent: number; product?: number }>([
      ["seller-a", { defaultPercent: 6, product: 6 }],
      ["seller-b", { defaultPercent: 4 }],
    ])
    const rateFor = (sellerId: string, productId: string) => {
      const row = rates.get(sellerId)
      const sellerPercent =
        productId === "prod_x" && row?.product != null
          ? row.product
          : (row?.defaultPercent ?? 8)
      return sellerPercent + 3
    }
    const soldByB = affiliateSaleCommissions({
      referredProductId: "prod_x",
      lines: [
        {
          offerId: "offr_b",
          sellerId: "seller-b",
          productId: "prod_x",
          subtotal: 95,
        },
      ],
      rateFor,
    })
    expect(soldByB).toEqual([
      expect.objectContaining({
        seller_id: "seller-b",
        offer_id: "offr_b",
        percent_points: 7,
        amount: 6.65,
      }),
    ])
    expect(soldByB.some((row) => row.seller_id === "seller-a")).toBe(false)
  })

  it("keeps a stored sale rate when the seller later changes settings", () => {
    const atSale = commissionForSellerProduct(
      { default_commission_percent: 4, product_commissions: [] },
      "prod_x"
    )
    const snapshot = atSale.totalPercent
    const later = commissionForSellerProduct(
      { default_commission_percent: 6, product_commissions: [] },
      "prod_x"
    )
    expect(snapshot).toBe(7)
    expect(later.totalPercent).toBe(9)
    expect(snapshot).toBe(7)
  })

  it("uses the cases from the commission matrix", () => {
    expect(
      commissionForSellerProduct(
        { default_commission_percent: 8, product_commissions: [] },
        "prod_plain"
      ).totalPercent
    ).toBe(11)
    expect(
      commissionForSellerProduct(
        {
          default_commission_percent: 8,
          product_commissions: [
            { product_id: "prod_bosch", product_title: "Bosch", commission_percent: 5 },
          ],
        },
        "prod_bosch"
      ).totalPercent
    ).toBe(8)
    expect(
      commissionForSellerProduct(
        {
          default_commission_percent: 8,
          product_commissions: [
            { product_id: "prod_bosch", product_title: "Bosch", commission_percent: 7 },
          ],
        },
        "prod_bosch"
      ).totalPercent
    ).toBe(10)
    expect(
      commissionForSellerProduct(
        { default_commission_percent: 6, product_commissions: [] },
        "prod_plain"
      ).totalPercent
    ).toBe(9)
    const both = affiliateSaleCommissions({
      referredProductId: "prod_x",
      lines: [
        { offerId: "offr_a", sellerId: "a", productId: "prod_x", subtotal: 100 },
        { offerId: "offr_b", sellerId: "b", productId: "prod_x", subtotal: 95 },
      ],
      rateFor: (sellerId) => (sellerId === "a" ? 9 : 7),
    })
    expect(Math.max(...both.map((row) => row.percent_points))).toBe(9)
    expect(both.map((row) => row.percent_points).sort()).toEqual([7, 9])
  })
})
