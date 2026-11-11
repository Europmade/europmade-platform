import {
  comparisonSpecRows,
  factualCategoryComparison,
  orderedComparisonProducts,
  reliableAttributeUnit,
} from "../category-v2-comparison"

const products = [
  { id: "prod_a", title: "A", specs: [{ code: "geluid", value: "44" }] },
  { id: "prod_b", title: "B", specs: [{ code: "geluid", value: "0" }] },
  { id: "prod_c", title: "C", specs: [] },
]

const attributes = [
  { code: "geluid", name: "Geluidsniveau", dataType: "Numeriek", unit: "dB", comparable: true },
  { code: "herkomst", name: "Herkomst", dataType: "Tekst", unit: "nee", comparable: true },
  { code: "merk", name: "Merk", dataType: "Keuzelijst", unit: null, comparable: false },
]

describe("category v2 comparison", () => {
  it("keeps the stored product order and drops ids outside the category set", () => {
    const selected = orderedComparisonProducts(products, ["prod_c", "missing", "prod_a", "prod_c"])
    expect(selected.map((product) => product.id)).toEqual(["prod_c", "prod_a"])
  })

  it("does not choose products when none are stored", () => {
    expect(orderedComparisonProducts(products, [])).toEqual([])
    expect(orderedComparisonProducts(products, ["  "])).toEqual([])
  })

  it("accepts a single selected product", () => {
    expect(orderedComparisonProducts(products, ["prod_b"]).map((product) => product.id)).toEqual(["prod_b"])
  })

  it("keeps a missing specification empty and a stored zero as a value", () => {
    const rows = comparisonSpecRows(["geluid"], attributes, products)
    expect(rows).toEqual([
      {
        code: "geluid",
        label: "Geluidsniveau",
        unit: "dB",
        values: ["44", "0", null],
        hasValue: true,
      },
    ])
  })

  it("keeps a specification that has no values on the selected products", () => {
    const rows = comparisonSpecRows(["geluid"], attributes, [products[2]])
    expect(rows[0]?.values).toEqual([null])
    expect(rows[0]?.hasValue).toBe(false)
  })

  it("skips attributes that are not comparable or have no reliable datatype", () => {
    const rows = comparisonSpecRows(["herkomst", "merk", "onbekend"], attributes, products)
    expect(rows).toEqual([])
  })

  it("does not treat a yes or no flag as a unit", () => {
    expect(reliableAttributeUnit("nee")).toBeNull()
    expect(reliableAttributeUnit("dB")).toBe("dB")
    expect(reliableAttributeUnit("")).toBeNull()
  })

  it("suggests a comparison only when two products share a comparable value", () => {
    const shared = factualCategoryComparison(
      [
        { ...products[1], slug: "b", testCatalog: true },
        { ...products[0], slug: "a", testCatalog: false },
        products[2],
      ],
      attributes
    )
    expect(shared?.products.map((product) => product.id)).toEqual(["prod_a", "prod_b"])
    expect(shared?.specCodes).toEqual(["geluid"])
    expect(factualCategoryComparison([products[0]], attributes)).toBeNull()
  })
})
