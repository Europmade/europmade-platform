import {
  parseUseCaseTags,
  productMatchesUseCase,
  serializeUseCaseTags,
  slugifyCategoryName,
  CATEGORY_ATTRIBUTE_CATALOGS,
} from "../category-attributes"

describe("Product Cloud category-attributes helpers (ADR-0037)", () => {
  it("slugifies category names for storefront paths", () => {
    expect(slugifyCategoryName("Elektronica")).toBe("elektronica")
    expect(slugifyCategoryName("Beauty & Verzorging")).toBe(
      "beauty-en-verzorging"
    )
    expect(slugifyCategoryName("  Tuin  ")).toBe("tuin")
  })

  it("exposes category-specific attribute catalogs", () => {
    expect(CATEGORY_ATTRIBUTE_CATALOGS.elektronica?.some((a) => a.code === "geheugen")).toBe(
      true
    )
    expect(CATEGORY_ATTRIBUTE_CATALOGS.tuin?.some((a) => a.code === "vermogen")).toBe(
      true
    )
    expect(CATEGORY_ATTRIBUTE_CATALOGS.mode?.some((a) => a.code === "pasvorm")).toBe(
      true
    )
  })

  it("serializes and matches use-case tags for toplist prep", () => {
    const json = serializeUseCaseTags(["student", "budget", "student"])
    expect(parseUseCaseTags(json)).toEqual(["student", "budget"])
    expect(productMatchesUseCase(json, "student")).toBe(true)
    expect(productMatchesUseCase(json, "premium")).toBe(false)
    expect(productMatchesUseCase(null, "student")).toBe(false)
  })
})
