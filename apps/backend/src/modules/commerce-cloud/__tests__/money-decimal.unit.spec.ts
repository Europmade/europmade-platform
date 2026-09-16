/**
 * Mirrors seller UI money parsing (apps/web/.../money-input.ts) and
 * backend CountryConfigSchema string coerce for shipping costs.
 */
function parseMoneyDecimal(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^\d+[.,]?$/.test(trimmed) && (trimmed.endsWith(",") || trimmed.endsWith("."))) {
    return null
  }
  const normalized = trimmed.replace(",", ".")
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

describe("shipping money decimal parsing", () => {
  it.each([
    ["4.95", 4.95],
    ["4,95", 4.95],
    ["0", 0],
    ["12", 12],
    ["12.50", 12.5],
  ])("parses %s → %s", (raw, expected) => {
    expect(parseMoneyDecimal(raw)).toBe(expected)
  })

  it("rejects incomplete mid-edit", () => {
    expect(parseMoneyDecimal("4.")).toBeNull()
    expect(parseMoneyDecimal("4,")).toBeNull()
  })

  it("backend coerce accepts comma strings like the Zod preprocess", () => {
    const coerce = (value: unknown) => {
      if (typeof value === "string") {
        const normalized = value.trim().replace(",", ".")
        if (!normalized) return Number.NaN
        return Number(normalized)
      }
      return value
    }
    expect(coerce("4,95")).toBe(4.95)
    expect(coerce("4.95")).toBe(4.95)
  })
})
