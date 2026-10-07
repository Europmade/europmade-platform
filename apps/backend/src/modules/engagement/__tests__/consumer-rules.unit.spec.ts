import {
  countryLabel,
  isPreviewUnsubscribeToken,
  localeLabel,
  newsletterLabel,
  normalizeConsumerEmail,
  sourceLabel,
} from "../consumer-rules"

describe("consumer rules", () => {
  it("normalizes email and rejects an invalid address", () => {
    expect(normalizeConsumerEmail("  Maria@Example.NL ")).toBe("maria@example.nl")
    expect(() => normalizeConsumerEmail("geen-adres")).toThrow(/geldig e-mailadres/)
  })

  it("labels newsletter state without technical tokens", () => {
    expect(newsletterLabel(true)).toBe("Ingeschreven")
    expect(newsletterLabel(false)).toBe("Uitgeschreven")
    expect(sourceLabel("website")).toBe("Website")
    expect(countryLabel("NL")).toBe("Nederland")
    expect(localeLabel("nl")).toBe("Nederlands")
    expect(isPreviewUnsubscribeToken("voorbeeld")).toBe(true)
    expect(isPreviewUnsubscribeToken("iets-anders")).toBe(false)
  })
})
