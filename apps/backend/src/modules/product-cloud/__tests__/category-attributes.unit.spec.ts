import {
  parseUseCaseTags,
  productMatchesUseCase,
  serializeUseCaseTags,
  slugifyCategoryName,
  categoryIdsMatchingCatalogFilter,
  productMatchesCategoryFilter,
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

  it("matches catalog products on exact category slug or name, not substrings", () => {
    expect(
      productMatchesCategoryFilter(["Elektronica"], "elektronica")
    ).toBe(true)
    expect(
      productMatchesCategoryFilter(["Elektronica"], "Elektronica")
    ).toBe(true)
    expect(
      productMatchesCategoryFilter(["Tuin"], "elektronica")
    ).toBe(false)
    expect(
      productMatchesCategoryFilter(["Consumentenelektronica"], "elektronica")
    ).toBe(false)
    expect(
      productMatchesCategoryFilter(
        ["Beauty & Verzorging"],
        "beauty-verzorging"
      )
    ).toBe(true)
    expect(
      productMatchesCategoryFilter(
        ["Schoenen"],
        "schoenen,tassen-en-accessoires"
      )
    ).toBe(true)
    expect(
      productMatchesCategoryFilter(
        ["Tuin"],
        "schoenen,tassen-en-accessoires"
      )
    ).toBe(false)
  })

  it("limits a catalog scan to categories whose name matches the filter", () => {
    const categories = [
      { id: "wash", name: "Wasmachines" },
      { id: "dry", name: "Wasdrogers" },
      { id: "dish-name", name: "Vaatwassers" },
      { id: "empty", name: "" },
    ]
    expect(categoryIdsMatchingCatalogFilter(categories, "wasmachines")).toEqual(["wash"])
    expect(categoryIdsMatchingCatalogFilter(categories, "vaatwassers")).toEqual(["dish-name"])
    expect(categoryIdsMatchingCatalogFilter(categories, "wasmachines,wasdrogers")).toEqual([
      "wash",
      "dry",
    ])
    expect(categoryIdsMatchingCatalogFilter(categories, "")).toEqual([])
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

  it("returns tuin fields for heggenschaar and EU sizes for schoenen", () => {
    const hedge = categorySpecificFieldsForNames(["Heggenschaar"])
    expect(hedge.some((f) => f.code === "vermogen")).toBe(true)
    expect(hedge.some((f) => f.code === "maat")).toBe(false)
    const shoes = categorySpecificFieldsForNames(["Schoenen"])
    const shoeSize = shoes.find((f) => f.code === "maat")
    expect(shoeSize?.option_values).toContain("40")
    expect(shoeSize?.option_values).not.toContain("XS")
    expect(shoes.some((f) => f.code === "zuigkracht")).toBe(false)
    const women = categorySpecificFieldsForNames(["Damesschoenen"])
    expect(women.find((f) => f.code === "maat")?.option_values).toContain("40")
    expect(women.find((f) => f.code === "maat")?.option_values).not.toContain("47")
    const clothing = categorySpecificFieldsForNames(["Kleding"])
    expect(clothing.find((f) => f.code === "maat")?.option_values).toEqual([
      "XS",
      "S",
      "M",
      "L",
      "XL",
    ])
  })

  it("serializes and matches use-case tags for toplist prep", () => {
    const json = serializeUseCaseTags(["student", "budget", "student"])
    expect(parseUseCaseTags(json)).toEqual(["student", "budget"])
    expect(productMatchesUseCase(json, "student")).toBe(true)
    expect(productMatchesUseCase(json, "premium")).toBe(false)
    expect(productMatchesUseCase(null, "student")).toBe(false)
  })
})
