import {
  parseUseCaseTags,
  productMatchesUseCase,
  serializeUseCaseTags,
  slugifyCategoryName,
  CATEGORY_ATTRIBUTE_CATALOGS,
  uniqueCatalogFieldsForImport,
  categorySpecificFieldsForNames,
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
    expect(
      CATEGORY_ATTRIBUTE_CATALOGS.robotstofzuiger?.some((a) => a.code === "zuigkracht")
    ).toBe(true)
  })

  it("keeps the general import catalog free of category-only fields", () => {
    const codes = uniqueCatalogFieldsForImport().map((f) => f.code)
    expect(codes).not.toContain("maat")
    expect(codes).not.toContain("wifi")
    expect(codes).not.toContain("zuigkracht")
    expect(codes).not.toContain("punten")
  })

  it("returns robotstofzuiger fields after category matching", () => {
    const fields = categorySpecificFieldsForNames(["Robotstofzuiger"])
    expect(fields.some((f) => f.code === "zuigkracht")).toBe(true)
  })

  it("returns tuin fields for heggenschaar and mode fields for schoenen", () => {
    const hedge = categorySpecificFieldsForNames(["Heggenschaar"])
    expect(hedge.some((f) => f.code === "vermogen")).toBe(true)
    expect(hedge.some((f) => f.code === "maat")).toBe(false)
    const shoes = categorySpecificFieldsForNames(["Schoenen"])
    expect(shoes.some((f) => f.code === "maat")).toBe(true)
    expect(shoes.some((f) => f.code === "zuigkracht")).toBe(false)
  })

  it("serializes and matches use-case tags for toplist prep", () => {
    const json = serializeUseCaseTags(["student", "budget", "student"])
    expect(parseUseCaseTags(json)).toEqual(["student", "budget"])
    expect(productMatchesUseCase(json, "student")).toBe(true)
    expect(productMatchesUseCase(json, "premium")).toBe(false)
    expect(productMatchesUseCase(null, "student")).toBe(false)
  })
})
