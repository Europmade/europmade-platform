import {
  bulkPmCandidateKey,
  evaluateBulkProductManagerChoice,
  formatCurrentManagerDisplay,
  intersectBulkPmCandidates,
  type BulkPmProductContext,
} from "../bulk-product-manager"

describe("bulk-product-manager", () => {
  function ctx(
    partial: Partial<BulkPmProductContext> & { product_id: string }
  ): BulkPmProductContext {
    return {
      title: partial.title ?? partial.product_id,
      current: partial.current ?? {
        kind: "none",
        seller_id: null,
        display_name: "Geen beheerder",
        label: "Geen beheerder",
      },
      offerSellerIds: partial.offerSellerIds ?? [],
      brandOwnerAvailable: partial.brandOwnerAvailable ?? false,
      candidates: partial.candidates ?? [
        { kind: "none", seller_id: null, label: "Geen beheerder" },
      ],
      product_id: partial.product_id,
    }
  }

  it("A: 3 valid products → all_valid for shared brand_owner", () => {
    const products = ["p1", "p2", "p3"].map((id) =>
      ctx({
        product_id: id,
        title: `Product ${id}`,
        brandOwnerAvailable: true,
        offerSellerIds: ["sel_a"],
        candidates: [
          { kind: "none", seller_id: null, label: "Geen beheerder" },
          {
            kind: "brand_owner",
            seller_id: "sel_owner",
            label: "Merkeigenaar — Merz",
          },
          { kind: "seller", seller_id: "sel_a", label: "Seller — A" },
        ],
      })
    )
    const shared = intersectBulkPmCandidates(products.map((p) => p.candidates))
    expect(shared.map(bulkPmCandidateKey)).toEqual([
      "none:",
      "brand_owner:sel_owner",
      "seller:sel_a",
    ])
    const result = evaluateBulkProductManagerChoice({
      products,
      kind: "brand_owner",
      seller_id: "sel_owner",
      new_display: "Merz b. Schwanen",
      new_type: "Merkeigenaar",
    })
    expect(result.all_valid).toBe(true)
    expect(result.rows).toHaveLength(3)
    expect(result.invalid_rows).toHaveLength(0)
  })

  it("B: overview keeps per-product current manager while new is shared", () => {
    const products = [
      ctx({
        product_id: "p1",
        title: "Alpha",
        current: {
          kind: "seller",
          seller_id: "sel_a",
          display_name: "Seller A BV",
          label: "Seller",
        },
        brandOwnerAvailable: true,
        offerSellerIds: ["sel_a"],
      }),
      ctx({
        product_id: "p2",
        title: "Beta",
        current: {
          kind: "none",
          seller_id: null,
          display_name: "Geen beheerder",
          label: "Geen beheerder",
        },
        brandOwnerAvailable: true,
        offerSellerIds: ["sel_a"],
      }),
    ]
    const result = evaluateBulkProductManagerChoice({
      products,
      kind: "brand_owner",
      new_display: "Merz b. Schwanen",
      new_type: "Merkeigenaar",
    })
    expect(result.all_valid).toBe(true)
    expect(result.rows[0]?.current_display).toBe("Seller A BV")
    expect(result.rows[1]?.current_display).toBe("Geen beheerder")
    expect(result.rows.every((r) => r.new_display === "Merz b. Schwanen")).toBe(
      true
    )
  })

  it("C: invalid candidate for one product → all_valid false, no apply implied", () => {
    const products = [
      ctx({
        product_id: "p1",
        brandOwnerAvailable: true,
        offerSellerIds: ["sel_a", "sel_b"],
      }),
      ctx({
        product_id: "p2",
        brandOwnerAvailable: true,
        offerSellerIds: ["sel_a"], // sel_b has no offer here
      }),
    ]
    const result = evaluateBulkProductManagerChoice({
      products,
      kind: "seller",
      seller_id: "sel_b",
      new_display: "Seller B",
      new_type: "Seller",
    })
    expect(result.all_valid).toBe(false)
    expect(result.invalid_rows).toHaveLength(1)
    expect(result.invalid_rows[0]?.product_id).toBe("p2")
    expect(result.invalid_rows[0]?.error).toMatch(/aanbod/)
    // Other product would have been valid alone — bulk still blocked.
    expect(result.rows.find((r) => r.product_id === "p1")?.valid).toBe(true)
  })

  it("D: Geen beheerder is valid for all", () => {
    const products = [
      ctx({
        product_id: "p1",
        current: {
          kind: "seller",
          seller_id: "sel_a",
          display_name: "A",
          label: "Seller",
        },
        offerSellerIds: ["sel_a"],
      }),
      ctx({
        product_id: "p2",
        brandOwnerAvailable: true,
        offerSellerIds: [],
      }),
    ]
    const result = evaluateBulkProductManagerChoice({
      products,
      kind: "none",
      seller_id: null,
      new_display: "Geen beheerder",
      new_type: "Geen beheerder",
    })
    expect(result.all_valid).toBe(true)
    expect(result.rows.every((r) => r.new_display === "Geen beheerder")).toBe(
      true
    )
  })

  it("E: formatCurrentManagerDisplay covers types used in audit overview", () => {
    expect(
      formatCurrentManagerDisplay({
        kind: "none",
        label: "Geen beheerder",
      })
    ).toBe("Geen beheerder")
    expect(
      formatCurrentManagerDisplay({
        kind: "brand_owner",
        brand_name: "Merz b. Schwanen",
        label: "Merkeigenaar",
      })
    ).toBe("Merz b. Schwanen")
    expect(
      formatCurrentManagerDisplay({
        kind: "seller",
        seller_name: "Acme",
        seller_id: "sel_a",
        label: "Seller",
      })
    ).toBe("Acme")
  })

  it("intersection drops sellers not present on every product", () => {
    const shared = intersectBulkPmCandidates([
      [
        { kind: "none", seller_id: null, label: "Geen beheerder" },
        { kind: "seller", seller_id: "sel_a", label: "Seller — A" },
        { kind: "seller", seller_id: "sel_b", label: "Seller — B" },
      ],
      [
        { kind: "none", seller_id: null, label: "Geen beheerder" },
        { kind: "seller", seller_id: "sel_a", label: "Seller — A" },
      ],
    ])
    expect(shared.map(bulkPmCandidateKey)).toEqual(["none:", "seller:sel_a"])
  })
})
