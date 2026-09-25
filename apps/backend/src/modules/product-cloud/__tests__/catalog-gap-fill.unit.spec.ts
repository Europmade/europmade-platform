import {
  buildInformationGapFill,
  catalogGapsFromCurrent,
  isBlankCatalogText,
} from "../catalog-gap-fill"

describe("catalog-gap-fill", () => {
  it("treats empty and whitespace as blank", () => {
    expect(isBlankCatalogText(null)).toBe(true)
    expect(isBlankCatalogText("")).toBe(true)
    expect(isBlankCatalogText("   ")).toBe(true)
    expect(isBlankCatalogText("MOEVE")).toBe(false)
  })

  it("fills only blank fields and rejects occupied ones", () => {
    const { fill, rejected_occupied } = buildInformationGapFill({
      current: {
        title: "Existing",
        description: "",
        brand_id: "brand_1",
        manufacturer_id: null,
      },
      proposed: {
        title: "Overwrite attempt",
        description: "New desc",
        brand_id: "brand_2",
        manufacturer_id: "man_1",
      },
    })
    expect(fill).toEqual({
      description: "New desc",
      manufacturer_id: "man_1",
    })
    expect(rejected_occupied).toEqual(["title", "brand_id"])
  })

  it("reports which gaps exist", () => {
    expect(
      catalogGapsFromCurrent({
        title: "X",
        description: null,
        brand_id: "",
        manufacturer_id: "m1",
      })
    ).toEqual({
      title: false,
      description: true,
      brand_id: true,
      manufacturer_id: false,
    })
  })
})
