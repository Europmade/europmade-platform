import {
  countryLabel,
  isPreviewUnsubscribeToken,
  localeLabel,
  newsletterLabel,
  normalizeConsumerEmail,
  planNewsletterTopics,
  resolveNewsletterTopics,
  sourceLabel,
  topicsEnableNewsletter,
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

  it("keeps three newsletter topics on the consumer and follows an existing signup", () => {
    expect(resolveNewsletterTopics(null, true)).toEqual({
      news: true,
      brands: true,
      offers: true,
    })
    expect(resolveNewsletterTopics(null, false)).toEqual({
      news: false,
      brands: false,
      offers: false,
    })
    const topics = planNewsletterTopics({ news: true, brands: false, offers: true })
    expect(topics).toEqual({ news: true, brands: false, offers: true })
    expect(topicsEnableNewsletter(topics)).toBe(true)
    expect(topicsEnableNewsletter(planNewsletterTopics({ news: false, brands: false, offers: false }))).toBe(
      false
    )
  })
})
