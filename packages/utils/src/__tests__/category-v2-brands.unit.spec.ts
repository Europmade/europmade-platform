import { categoryBrandHref, selectCategoryBrands } from "../category-v2-brands"

const bosch = {
  id: "prod_bosch",
  brandId: "brand_bosch",
  brandName: "Bosch",
  brandSlug: "bosch",
  logoUrl: "https://cdn.example/bosch.svg",
  brandPagePublished: true,
}
const siemens = {
  id: "prod_siemens",
  brandId: "brand_siemens",
  brandName: "Siemens",
  brandSlug: "siemens",
  logoUrl: null,
  brandPagePublished: true,
}

describe("category v2 brands", () => {
  it("shows a brand that has a relevant published product", () => {
    expect(selectCategoryBrands([bosch], 16)).toEqual([
      {
        id: "brand_bosch",
        name: "Bosch",
        logoUrl: "https://cdn.example/bosch.svg",
        href: "/merk/bosch",
        productCount: 1,
      },
    ])
  })

  it("drops a brand that is not present in the supplied category products", () => {
    const cards = selectCategoryBrands([bosch], 16)
    expect(cards.map((card) => card.id)).toEqual(["brand_bosch"])
  })

  it("does not count a product that is absent from the category selection", () => {
    const cards = selectCategoryBrands(
      [{ ...siemens, id: "prod_other_category" }, bosch],
      16
    )
    expect(cards.find((card) => card.id === "brand_siemens")?.productCount).toBe(1)
    expect(cards.find((card) => card.id === "brand_bosch")?.productCount).toBe(1)
  })

  it("counts products from child categories when they are in the supplied selection", () => {
    const cards = selectCategoryBrands(
      [bosch, { ...bosch, id: "prod_child" }],
      16
    )
    expect(cards[0]?.productCount).toBe(2)
  })

  it("counts one product once when it is repeated", () => {
    const cards = selectCategoryBrands([bosch, { ...bosch }, { ...bosch, brandId: "brand_siemens", brandName: "Siemens" }], 16)
    expect(cards).toHaveLength(1)
    expect(cards[0]?.productCount).toBe(1)
  })

  it("keeps a legacy brand id that is equal to the brand name when the page slug is stored", () => {
    const cards = selectCategoryBrands(
      [{ id: "prod_bosch", brandId: "Bosch", brandName: "Bosch", brandSlug: "bosch", logoUrl: "https://cdn.example/bosch.webp", brandPagePublished: true }],
      16
    )
    expect(cards[0]?.href).toBe("/merk/bosch")
    expect(cards[0]?.logoUrl).toBe("https://cdn.example/bosch.webp")
  })

  it("ignores a product without a stable brand id", () => {
    expect(
      selectCategoryBrands([{ id: "prod_loose", brandId: "", brandName: "Los merk" }], 16)
    ).toEqual([])
  })

  it("keeps a stored logo and a brand without a logo", () => {
    const cards = selectCategoryBrands([bosch, siemens], 16)
    expect(cards.find((card) => card.id === "brand_bosch")?.logoUrl).toBe("https://cdn.example/bosch.svg")
    expect(cards.find((card) => card.id === "brand_siemens")?.logoUrl).toBeNull()
    expect(cards.find((card) => card.id === "brand_siemens")?.name).toBe("Siemens")
  })

  it("links only a published brand page with a stored slug", () => {
    expect(categoryBrandHref("bosch", true)).toBe("/merk/bosch")
    expect(categoryBrandHref("bosch", false)).toBeNull()
    expect(categoryBrandHref("", true)).toBeNull()
    expect(categoryBrandHref("Bosch Serie", true)).toBeNull()
    expect(categoryBrandHref("../admin", true)).toBeNull()
  })

  it("respects the maximum and orders by product count, then name", () => {
    const cards = selectCategoryBrands(
      [
        siemens,
        { ...siemens, id: "prod_siemens_2" },
        bosch,
        { id: "prod_aeg", brandId: "brand_aeg", brandName: "AEG", brandSlug: "aeg", brandPagePublished: true },
      ],
      2
    )
    expect(cards.map((card) => card.name)).toEqual(["Siemens", "AEG"])
    expect(cards[0]?.productCount).toBe(2)
    expect(cards[1]?.productCount).toBe(1)
  })

  it("does not read a brand country or sponsorship flag", () => {
    const cards = selectCategoryBrands(
      [{ ...bosch, countryCode: "DE", allowSponsored: true } as never],
      16
    )
    expect(cards[0]).toEqual({
      id: "brand_bosch",
      name: "Bosch",
      logoUrl: "https://cdn.example/bosch.svg",
      href: "/merk/bosch",
      productCount: 1,
    })
    expect(JSON.stringify(cards[0])).not.toMatch(/DE|sponsored|europe/i)
  })
})
