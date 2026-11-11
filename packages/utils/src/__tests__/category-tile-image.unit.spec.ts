import { categoryTileImageBrief, categoryTilePublicPath } from "../category-tile-image"

describe("category tile image brief", () => {
  it("builds a different brief for each category from its own name", () => {
    const kitchen = categoryTileImageBrief({ name: "Keuken", parentName: "Huishouden" })
    const laundry = categoryTileImageBrief({ name: "Wassen & drogen", parentName: "Huishouden" })
    expect(kitchen).toContain("Keuken")
    expect(kitchen).toContain("Huishouden")
    expect(laundry).toContain("Wassen & drogen")
    expect(kitchen).not.toBe(laundry)
    expect(kitchen).toContain("Warm natuurlijk daglicht")
    expect(laundry).toContain("Warm natuurlijk daglicht")
  })

  it("uses the category description when one is present", () => {
    const brief = categoryTileImageBrief({
      name: "Stofzuigen",
      parentName: "Huishouden",
      description: "Stofzuigers voor vloeren en tapijt.",
    })
    expect(brief).toContain("Stofzuigers voor vloeren en tapijt.")
  })

  it("returns no brief and no public path for an empty subject", () => {
    expect(categoryTileImageBrief({ name: "  " })).toBe("")
    expect(categoryTilePublicPath("")).toBeNull()
    expect(categoryTilePublicPath("../keuken")).toBeNull()
    expect(categoryTilePublicPath("was-droog")).toBe("/category/tiles/was-droog.jpg")
  })
})
