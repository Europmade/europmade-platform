import { expandCategorySlugsWithDescendants } from "../commercial-nav"
import {
  buildCategoryV2Facets,
  paginateCategoryV2Products,
  productMatchesCategoryV2Filters,
  sortCategoryV2Products,
} from "../category-v2-listing"

describe("category v2 listing", () => {
  it("keeps a parent listing on its own category and descendants", () => {
    const filter = expandCategorySlugsWithDescendants("inbouwapparatuur", [
      { id: "l2", slug: "inbouwapparatuur", parent_category_id: "l1" },
      { id: "l3", slug: "vaatwassers", parent_category_id: "l2" },
      { id: "other", slug: "koelkasten", parent_category_id: "l2" },
    ])
    expect(filter.split(",")).toEqual(["inbouwapparatuur", "vaatwassers", "koelkasten"])
    const own = expandCategorySlugsWithDescendants("vaatwassers", [
      { id: "l3", slug: "vaatwassers", parent_category_id: "l2" },
      { id: "other", slug: "koelkasten", parent_category_id: "l2" },
    ])
    expect(own).toBe("vaatwassers")
  })

  it("does not treat a missing specification as a filter match", () => {
    const facets = [{ attributeKey: "energieklasse", type: "checkbox" as const }]
    expect(
      productMatchesCategoryV2Filters(
        { specs: [] },
        facets,
        { energieklasse: { values: ["a"] } }
      )
    ).toBe(false)
    expect(
      productMatchesCategoryV2Filters(
        { specs: [{ code: "energieklasse", value: "A" }] },
        facets,
        { energieklasse: { values: ["a"] } }
      )
    ).toBe(true)
  })

  it("sorts missing prices after real prices", () => {
    const products = [
      { title: "Zonder", priceCents: 0 },
      { title: "Duur", priceCents: 80000 },
      { title: "Goedkoop", priceCents: 12000 },
    ]
    expect(sortCategoryV2Products(products, "price_asc").map((row) => row.title)).toEqual([
      "Goedkoop",
      "Duur",
      "Zonder",
    ])
    expect(sortCategoryV2Products(products, "price_desc").map((row) => row.title)).toEqual([
      "Duur",
      "Goedkoop",
      "Zonder",
    ])
  })

  it("hides filters without usable values and applies admin order", () => {
    const facets = buildCategoryV2Facets(
      [
        { code: "energieklasse", name: "Energieklasse", dataType: "Keuzelijst" },
        { code: "leeg", name: "Leeg", dataType: "Keuzelijst" },
        { code: "geluid", name: "Geluidsniveau", dataType: "Numeriek" },
      ],
      [
        { specs: [{ code: "energieklasse", value: "B" }, { code: "geluid", value: "44 dB" }] },
        { specs: [{ code: "energieklasse", value: "A" }] },
      ],
      [
        { attributeKey: "geluid", visible: true, label: "Geluid", sortOrder: 0 },
        { attributeKey: "energieklasse", visible: true, label: "", sortOrder: 2 },
        { attributeKey: "leeg", visible: true, label: "Leeg", sortOrder: 1 },
      ]
    )
    expect(facets.map((facet) => facet.attributeKey)).toEqual(["geluid", "energieklasse"])
    expect(facets[0]?.label).toBe("Geluid")
    expect(facets[0]?.type).toBe("range")
    expect(facets[1]?.options.map((option) => option.label)).toEqual(["A", "B"])
  })

  it("keeps automatic filters when stored controls use other keys", () => {
    const facets = buildCategoryV2Facets(
      [{ code: "vulgewicht", name: "Vulgewicht", dataType: "Numeriek" }],
      [{ specs: [{ code: "vulgewicht", value: "9 kg" }] }],
      [{ attributeKey: "slot_id", visible: true, label: "Oud", sortOrder: 0 }]
    )
    expect(facets.map((facet) => facet.attributeKey)).toEqual(["vulgewicht"])
  })

  it("pages the filtered set without gaps or duplicates", () => {
    const rows = ["a", "b", "c", "d", "e"]
    const first = paginateCategoryV2Products(rows, 1, 2)
    const second = paginateCategoryV2Products(rows, 2, 2)
    const third = paginateCategoryV2Products(rows, 3, 2)
    expect(first.items).toEqual(["a", "b"])
    expect(second.items).toEqual(["c", "d"])
    expect(third.items).toEqual(["e"])
    expect(new Set([...first.items, ...second.items, ...third.items]).size).toBe(5)
  })
})
