import {
  categoryProductIsPopular,
  selectCategoryShelf,
  type CategoryShelfCandidate,
} from "../category-shelf"

function item(
  slug: string,
  group: string,
  extra: Partial<CategoryShelfCandidate> = {}
): CategoryShelfCandidate {
  return {
    slug,
    categorySlugs: ["huishouden", group],
    priceCents: 10000,
    offerCount: 1,
    ...extra,
  }
}

describe("category shelf selection", () => {
  it("keeps visible test-catalog products and skips rows the storefront does not show", () => {
    const rows = selectCategoryShelf(
      [
        item("washer", "wasmachines", { testCatalog: true, priceCents: 0, offerCount: 0 }),
        item("dish", "vaatwassers"),
        item("draft", "ovens", { previewStatus: "concept", priceCents: 0, offerCount: 0 }),
        item("free", "stofzuigen", { priceCents: 0, offerCount: 0 }),
      ],
      "huishouden",
      6
    )
    expect(rows.map((row) => row.slug)).toEqual(["washer", "dish"])
  })

  it("spreads the shelf across product groups", () => {
    const rows = selectCategoryShelf(
      [
        item("w1", "wasmachines"),
        item("w2", "wasmachines"),
        item("w3", "wasmachines"),
        item("d1", "wasdrogers"),
        item("v1", "vaatwassers"),
        item("s1", "stofzuigen"),
      ],
      "huishouden",
      6
    )
    expect(rows.map((row) => row.slug)).toEqual(["w1", "d1", "v1", "s1", "w2", "w3"])
  })

  it("stops at 15 products and still takes every available group first", () => {
    const rows = selectCategoryShelf(
      [
        ...Array.from({ length: 20 }, (_, index) => item(`w${index}`, "wasmachines")),
        item("d1", "wasdrogers"),
        item("v1", "vaatwassers"),
      ],
      "huishouden",
      40
    )
    expect(rows).toHaveLength(15)
    expect(rows.slice(0, 3).map((row) => row.slug)).toEqual(["w0", "d1", "v1"])
  })

  it("does not call a product popular without a sales count", () => {
    const peers = [item("a", "wasmachines"), item("b", "wasdrogers", { salesCount: 4 })]
    expect(categoryProductIsPopular(peers[0]!, peers)).toBe(false)
    expect(categoryProductIsPopular(peers[1]!, peers)).toBe(true)
    expect(categoryProductIsPopular(item("c", "ovens", { salesCount: 0 }), peers)).toBe(false)
  })
})
