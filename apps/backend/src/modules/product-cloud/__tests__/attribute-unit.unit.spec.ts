import {
  formatAttributeDisplayName,
  sanitizeAttributeUnit,
} from "../category-attributes"

describe("sanitizeAttributeUnit", () => {
  it("drops ja/nee boolean flags and keeps real units", () => {
    expect(sanitizeAttributeUnit("nee")).toBeNull()
    expect(sanitizeAttributeUnit("NEE")).toBeNull()
    expect(sanitizeAttributeUnit("ja")).toBeNull()
    expect(sanitizeAttributeUnit("false")).toBeNull()
    expect(sanitizeAttributeUnit("0")).toBeNull()
    expect(sanitizeAttributeUnit("GB")).toBe("GB")
    expect(sanitizeAttributeUnit("inch")).toBe("inch")
    expect(sanitizeAttributeUnit(" cm ")).toBe("cm")
  })

  it("formats display names without bogus units", () => {
    expect(formatAttributeDisplayName("Merk", "nee")).toBe("Merk")
    expect(formatAttributeDisplayName("Geheugen", "GB")).toBe("Geheugen (GB)")
    expect(formatAttributeDisplayName("Processor", null)).toBe("Processor")
  })
})
