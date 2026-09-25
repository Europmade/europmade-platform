import {
  assertValidProductManagerAssignment,
  buildProductManagerSnapshot,
  productManagerAuditValues,
} from "../product-manager-assignment"

describe("product-manager-assignment", () => {
  it("builds snapshot for seller manager", () => {
    const snap = buildProductManagerSnapshot({
      kind: "seller",
      seller_id: "sel_a",
      seller_name: "Acme",
    })
    expect(snap.kind).toBe("seller")
    expect(snap.seller_id).toBe("sel_a")
    expect(snap.label).toBe("Seller")
  })

  it("rejects seller without offer", () => {
    expect(() =>
      assertValidProductManagerAssignment({
        kind: "seller",
        seller_id: "sel_x",
        offerSellerIds: ["sel_a", "sel_b"],
        brandOwnerAvailable: false,
      })
    ).toThrow(/aanbod/)
  })

  it("allows choosing one of two offer sellers", () => {
    expect(() =>
      assertValidProductManagerAssignment({
        kind: "seller",
        seller_id: "sel_b",
        offerSellerIds: ["sel_a", "sel_b"],
        brandOwnerAvailable: false,
      })
    ).not.toThrow()
  })

  it("rejects brand_owner when no verified owner", () => {
    expect(() =>
      assertValidProductManagerAssignment({
        kind: "brand_owner",
        offerSellerIds: ["sel_a"],
        brandOwnerAvailable: false,
      })
    ).toThrow(/merkeigenaar/)
  })

  it("allows none without seller id", () => {
    expect(() =>
      assertValidProductManagerAssignment({
        kind: "none",
        offerSellerIds: ["sel_a", "sel_b"],
        brandOwnerAvailable: true,
      })
    ).not.toThrow()
  })

  it("formats audit values", () => {
    expect(
      productManagerAuditValues({ kind: "seller", seller_id: "sel_a" })
    ).toEqual({ kind: "seller", seller_id: "sel_a" })
    expect(productManagerAuditValues({ kind: "none" })).toEqual({
      kind: "none",
      seller_id: "",
    })
  })

  it("supports bulk-style repeated assignment validation", () => {
    const productOfferMaps = [
      { offerSellerIds: ["sel_a", "sel_b"], brandOwnerAvailable: true },
      { offerSellerIds: ["sel_a"], brandOwnerAvailable: true },
    ]
    for (const ctx of productOfferMaps) {
      expect(() =>
        assertValidProductManagerAssignment({
          kind: "brand_owner",
          offerSellerIds: ctx.offerSellerIds,
          brandOwnerAvailable: ctx.brandOwnerAvailable,
        })
      ).not.toThrow()
    }
    expect(() =>
      assertValidProductManagerAssignment({
        kind: "seller",
        seller_id: "sel_b",
        offerSellerIds: ["sel_a"],
        brandOwnerAvailable: true,
      })
    ).toThrow(/aanbod/)
  })
})
