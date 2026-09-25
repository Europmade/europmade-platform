import {
  evaluateCatalogDirectEditAccess,
  isRealBrandId,
  normalizeProductManagerKind,
  formatProductManagerLabel,
} from "../catalog-edit-auth"

describe("evaluateCatalogDirectEditAccess (Productbeheerder)", () => {
  it("denies all sellers when no Productbeheerder is assigned", () => {
    const result = evaluateCatalogDirectEditAccess({
      actorSellerId: "sel_a",
      productManagerKind: "none",
      productManagerSellerId: null,
      isBrandOwner: false,
    })
    expect(result).toEqual({ allowed: false, reason: "denied_no_manager" })
  })

  it("allows assigned seller Productbeheerder to edit central data", () => {
    const result = evaluateCatalogDirectEditAccess({
      actorSellerId: "sel_a",
      productManagerKind: "seller",
      productManagerSellerId: "sel_a",
      isBrandOwner: false,
    })
    expect(result).toEqual({
      allowed: true,
      reason: "product_manager_seller",
    })
  })

  it("denies other seller when Seller A is Productbeheerder", () => {
    const result = evaluateCatalogDirectEditAccess({
      actorSellerId: "sel_b",
      productManagerKind: "seller",
      productManagerSellerId: "sel_a",
      isBrandOwner: false,
    })
    expect(result).toEqual({ allowed: false, reason: "denied_not_manager" })
  })

  it("does not grant rights from current_owner_seller_id alone", () => {
    const result = evaluateCatalogDirectEditAccess({
      actorSellerId: "sel_a",
      productManagerKind: "none",
      productManagerSellerId: null,
      currentOwnerSellerId: "sel_a",
      offerSellerIds: ["sel_a"],
      isBrandOwner: false,
    })
    expect(result.allowed).toBe(false)
  })

  it("allows verified brand owner when kind is brand_owner", () => {
    const result = evaluateCatalogDirectEditAccess({
      actorSellerId: "sel_brand",
      productManagerKind: "brand_owner",
      productManagerSellerId: null,
      isBrandOwner: true,
    })
    expect(result).toEqual({
      allowed: true,
      reason: "product_manager_brand_owner",
    })
  })

  it("denies non-brand-owner when kind is brand_owner", () => {
    const result = evaluateCatalogDirectEditAccess({
      actorSellerId: "sel_b",
      productManagerKind: "brand_owner",
      productManagerSellerId: null,
      isBrandOwner: false,
    })
    expect(result).toEqual({ allowed: false, reason: "denied_not_manager" })
  })

  it("keeps assigned seller rights even when multiple sellers offer", () => {
    const result = evaluateCatalogDirectEditAccess({
      actorSellerId: "sel_a",
      productManagerKind: "seller",
      productManagerSellerId: "sel_a",
      offerSellerIds: ["sel_a", "sel_b"],
      isBrandOwner: false,
    })
    expect(result.allowed).toBe(true)
  })

  it("normalizes unknown kind to none", () => {
    expect(normalizeProductManagerKind("weird")).toBe("none")
    expect(normalizeProductManagerKind("seller")).toBe("seller")
    expect(formatProductManagerLabel("brand_owner")).toBe("Merkeigenaar")
  })

  it("recognizes real brand ids", () => {
    expect(isRealBrandId("brand_01")).toBe(true)
    expect(isRealBrandId("MOEVE")).toBe(false)
    expect(isRealBrandId(null)).toBe(false)
  })
})
