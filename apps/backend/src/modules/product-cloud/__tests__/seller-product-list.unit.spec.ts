import {
  latestActivityIso,
  ownOfferFields,
  sellerListRowIsRelevant,
  sellerListRowMatchesQuery,
  sortSellerListNewest,
  unionSellerListProductIds,
  workingPublicationMatchesListFilter,
} from "../seller-product-list"

describe("seller product list includes owned products and own offers", () => {
  it("includes a Product Cloud product owned by the seller", () => {
    expect(
      sellerListRowIsRelevant({
        currentOwnerSellerId: "sel_a",
        actorSellerId: "sel_a",
        hasOwnOffer: false,
      })
    ).toBe(true)
  })

  it("includes an existing Product Cloud product when the seller has an offer", () => {
    expect(
      sellerListRowIsRelevant({
        currentOwnerSellerId: "sel_brand",
        actorSellerId: "sel_retailer",
        hasOwnOffer: true,
      })
    ).toBe(true)
    expect(unionSellerListProductIds(["prod_owned"], ["prod_dt990"])).toEqual([
      "prod_owned",
      "prod_dt990",
    ])
  })

  it("does not list a catalog product without an own offer as a sales listing", () => {
    expect(
      sellerListRowIsRelevant({
        currentOwnerSellerId: "sel_brand",
        actorSellerId: "sel_retailer",
        hasOwnOffer: false,
      })
    ).toBe(false)
  })

  it("does not treat another seller's offer as the logged-in seller's offer", () => {
    expect(
      ownOfferFields({
        actorSellerId: "sel_a",
        offerSellerId: "sel_b",
        price: 199,
        stock: 10,
        sku: "OTHER",
      })
    ).toEqual({ price: null, stock: null, sku: null })
  })

  it("shows a shared catalog product only once", () => {
    expect(
      unionSellerListProductIds(["prod_dt990"], ["prod_dt990", "prod_dt990"])
    ).toEqual(["prod_dt990"])
  })

  it("finds the offered product by name or brand", () => {
    const row = {
      id: "prod_dt990",
      title: "beyerdynamic DT 990 PRO",
      brand_name: "beyerdynamic",
      offer: { seller_sku: "ART-990" },
      offers: { sku_display: "ART-990" },
    }
    expect(sellerListRowMatchesQuery(row, "beyerdynamic")).toBe(true)
    expect(sellerListRowMatchesQuery(row, "DT 990")).toBe(true)
  })

  it("places a newly saved offer first when sorting by newest", () => {
    const listed = sortSellerListNewest([
      { id: "prod_old", list_activity_at: "2026-01-01T00:00:00.000Z" },
      { id: "prod_dt990", list_activity_at: "2026-09-16T08:00:00.000Z" },
    ])
    expect(listed[0].id).toBe("prod_dt990")
  })

  it("keeps offer money fields as the logged-in seller's offer", () => {
    expect(
      ownOfferFields({
        actorSellerId: "sel_retailer",
        offerSellerId: "sel_retailer",
        price: 500,
        stock: 42,
        sku: "ART-990",
      })
    ).toEqual({ price: 500, stock: 42, sku: "ART-990" })
  })

  it("filters pending_approval on publication status before enrichment", () => {
    expect(
      workingPublicationMatchesListFilter("In review", "pending_approval")
    ).toBe(true)
    expect(
      workingPublicationMatchesListFilter("Gepubliceerd", "pending_approval")
    ).toBe(false)
    expect(
      workingPublicationMatchesListFilter("Concept", "pending_approval")
    ).toBe(false)
    expect(workingPublicationMatchesListFilter("Concept", undefined)).toBe(true)
  })

  it("does not rewrite Product Cloud ownership when attaching an offer", () => {
    const ids = unionSellerListProductIds(["prod_owned"], ["prod_dt990"])
    expect(ids).toContain("prod_dt990")
    expect(ids).toContain("prod_owned")
    expect(latestActivityIso(["2026-09-16T08:00:00.000Z"])).toBe(
      "2026-09-16T08:00:00.000Z"
    )
  })
})
