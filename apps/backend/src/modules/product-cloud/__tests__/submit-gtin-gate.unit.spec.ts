import { resolveCatalogGtinValue } from "../concept-identifier"
import { SUBMIT_GTIN_MESSAGE } from "../../../api/store/product-cloud/submit-gates"

describe("submit GTIN gate", () => {
  it("treats DRAFT IMPORT_REF as missing GTIN", () => {
    expect(
      resolveCatalogGtinValue("IMPORT_REF", "DRAFT-ABC", "CONCEPT_DRAFT")
    ).toBeNull()
  })

  it("accepts a checksum-valid GTIN", () => {
    expect(resolveCatalogGtinValue("GTIN", "4006381333931", null)).toBe(
      "4006381333931"
    )
  })

  it("exposes the seller-facing submit message", () => {
    expect(SUBMIT_GTIN_MESSAGE).toMatch(/EAN\/GTIN/)
  })
})
