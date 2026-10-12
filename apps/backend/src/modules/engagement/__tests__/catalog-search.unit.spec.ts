import { catalogIdentifierValues, catalogProductHref } from "../catalog-search"

describe("catalog search", () => {
  it("uses a GTIN as identifier and a direct product path", () => {
    expect(catalogIdentifierValues(" 8720 0000 0000 1 ")).toEqual(["8720000000001"])
    expect(catalogIdentifierValues("shirt")).toEqual(["shirt"])
    expect(catalogProductHref("prod_1")).toBe("/product/prod_1")
    expect(catalogProductHref("")).toBe("")
    expect(catalogProductHref("prod_1")).not.toBe("/")
  })
})
