import {
  isValidGtin,
  isValidGtinChecksum,
  normalizeGtinDigits,
} from "../gtin-validation"

describe("gtin-validation", () => {
  it("normalizes whitespace", () => {
    expect(normalizeGtinDigits("4010 1180 0155 0")).toBe("4010118001550")
  })

  it("validates known GTIN checksums", () => {
    expect(isValidGtinChecksum("4242005482320")).toBe(true)
    expect(isValidGtinChecksum("4242005482321")).toBe(false)
  })

  it("accepts valid GTIN lengths", () => {
    expect(isValidGtin("4242005482320")).toBe(true)
  })

  it("rejects draft placeholders", () => {
    expect(isValidGtin("DRAFT-ABC")).toBe(false)
  })
})
