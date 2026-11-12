import { expandCategorySlugsWithDescendants } from "../commercial-nav"
import {
  applyCategoryV2FacetCounts,
  buildCategoryV2Facets,
  categoryV2FilterAttributes,
  paginateCategoryV2Products,
  categoryListingQueryFromSearch,
  productMatchesCategoryV2Filters,
  selectionFromListingQuery,
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

  it("builds filters from product specifications without a stored filter flag", () => {
    const attributes = categoryV2FilterAttributes(
      [{ code: "ean", name: "EAN", dataType: "Tekst", filterable: false }],
      [
        { specs: [{ code: "vulgewicht", value: "8 kg" }, { code: "kleur", value: "White" }] },
        { specs: [{ code: "vulgewicht", value: "9 kg" }, { code: "kleur", value: "Black" }] },
      ]
    )
    const facets = buildCategoryV2Facets(attributes, [
      { specs: [{ code: "vulgewicht", value: "8 kg" }, { code: "kleur", value: "White" }] },
      { specs: [{ code: "vulgewicht", value: "9 kg" }, { code: "kleur", value: "Black" }] },
    ], [])
    expect(facets.map((facet) => facet.attributeKey)).toEqual(["vulgewicht", "kleur"])
    expect(facets[0]?.type).toBe("range")
    expect(facets[1]?.options.map((option) => option.label)).toEqual(["Wit", "Zwart"])
    expect(facets.some((facet) => facet.attributeKey === "ean")).toBe(false)
  })

  it("keeps filterable shopping specs and leaves manufacturer contact data out", () => {
    const products = [
      {
        specs: [
          { code: "vulgewicht", value: "8 kg" },
          { code: "gpsr_email", value: "info@fabrikant.example" },
        ],
      },
    ]
    const attributes = categoryV2FilterAttributes(
      [
        { code: "vulgewicht", name: "Vulgewicht", dataType: "Numeriek", filterable: true },
        { code: "gpsr_email", name: "Fabrikant e-mail", dataType: "Tekst", filterable: false },
      ],
      products
    )
    const facets = buildCategoryV2Facets(attributes, products, [])
    expect(facets.map((facet) => facet.attributeKey)).toEqual(["vulgewicht"])
  })

  it("uses a filled specification that is not marked filterable and skips contact fields", () => {
    const products = [{ specs: [{ code: "breedte", value: "60 cm" }, { code: "mail", value: "service@example.com" }] }]
    const attributes = categoryV2FilterAttributes(
      [
        { code: "breedte", name: "Breedte", dataType: "Numeriek", filterable: false },
        { code: "mail", name: "Fabrikant e-mail", dataType: "Tekst", filterable: true },
      ],
      products
    )
    expect(attributes.map((row) => row.code)).toEqual(["breedte"])
  })

  it("merges the same specification under two codes and combines filters", () => {
    const products = [
      { specs: [{ code: "energieklasse", value: "A" }, { code: "kleur", value: "White" }] },
      { specs: [{ code: "energielabel", value: "B" }, { code: "kleur", value: "Black" }] },
      { specs: [{ code: "energieklasse", value: "A" }, { code: "kleur", value: "Black" }] },
    ]
    const facets = buildCategoryV2Facets(
      [
        { code: "energieklasse", name: "Energieklasse", dataType: "Keuzelijst" },
        { code: "energielabel", name: "Energielabel", dataType: "Keuzelijst" },
        { code: "kleur", name: "Kleur", dataType: "Keuzelijst" },
      ],
      products,
      []
    )
    const energy = facets.find((facet) => facet.label === "Energieklasse" || facet.attributeKeys?.includes("energielabel"))
    expect(energy?.attributeKeys).toEqual(["energieklasse", "energielabel"])
    expect(energy?.options.map((option) => option.label)).toEqual(["A", "B"])
    expect(
      products.filter((product) =>
        productMatchesCategoryV2Filters(product, facets, {
          [energy?.attributeKey ?? ""]: { values: ["a"] },
          kleur: { values: ["black"] },
        })
      )
    ).toHaveLength(1)
    const counted = applyCategoryV2FacetCounts(facets, products, { kleur: { values: ["white"] } })
    const countedEnergy = counted.find((facet) => facet.attributeKey === energy?.attributeKey)
    expect(countedEnergy?.options.find((option) => option.value === "a")?.count).toBe(1)
    expect(countedEnergy?.options.find((option) => option.value === "b")?.count).toBe(0)
  })

  it("keeps a filtered set in the same order when the sort changes", () => {
    const products = [
      { title: "Duur", priceCents: 90000, specs: [{ code: "kleur", value: "Wit" }] },
      { title: "Goedkoop", priceCents: 10000, specs: [{ code: "kleur", value: "Wit" }] },
      { title: "Anders", priceCents: 5000, specs: [{ code: "kleur", value: "Zwart" }] },
    ]
    const facets = [{ attributeKey: "kleur", type: "checkbox" as const }]
    const matched = products.filter((product) =>
      productMatchesCategoryV2Filters(product, facets, { kleur: { values: ["wit"] } })
    )
    expect(sortCategoryV2Products(matched, "price_asc").map((row) => row.title)).toEqual(["Goedkoop", "Duur"])
    expect(sortCategoryV2Products(matched, "price_desc").map((row) => row.title)).toEqual(["Duur", "Goedkoop"])
  })

  it("reads a category query into the existing filter selection and skips unknown facets", () => {
    const products = [
      { specs: [{ code: "vulgewicht", value: "9 kg" }, { code: "energielabel", value: "A" }] },
      { specs: [{ code: "vulgewicht", value: "8 kg" }, { code: "energielabel", value: "B" }] },
    ]
    const attributes = categoryV2FilterAttributes(
      [
        { code: "vulgewicht", name: "Vulgewicht", dataType: "Numeriek" },
        { code: "energielabel", name: "Energielabel", dataType: "Keuzelijst" },
      ],
      products
    )
    const facets = buildCategoryV2Facets(attributes, products, [])
    const query = categoryListingQueryFromSearch({
      f: ["Energielabel:A", "Onbekend:ja"],
      min: "Vulgewicht:9",
    })
    const selection = selectionFromListingQuery(facets, query)
    expect(selection.energielabel?.values).toEqual(["a"])
    expect(selection.vulgewicht?.min).toBe(9)
    expect(selection.onbekend).toBeUndefined()
    const matched = products.filter((product) => productMatchesCategoryV2Filters(product, facets, selection))
    expect(matched).toHaveLength(1)
  })
})
