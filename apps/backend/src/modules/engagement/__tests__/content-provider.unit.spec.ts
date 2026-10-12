import {
  LocalContentProvider,
  UnavailableContentProvider,
  createContentProviderFromEnv,
  draftProductSummary,
} from "../content-provider"

const base = {
  kind: "newsletter" as const,
  idea: "Nieuwe Europese merken uit Nederland",
  goal: "Deze merken onder de aandacht brengen",
  tone: "Professioneel en enthousiast",
  language: "nl",
  length: "normaal" as const,
  products: [],
}

describe("engagement content provider", () => {
  it("builds a newsletter from the request and real product facts", async () => {
    const draft = await new LocalContentProvider().generate({
      ...base,
      products: [
        {
          title: "Echte lamp",
          description: "Gemaakt in Nederland.",
          image_url: null,
        },
      ],
    })
    expect(draft.subject).toBe(base.idea)
    expect(draft.preheader).toBe(base.goal)
    expect(draft.body).toContain("<!--em-hero-->")
    expect(draft.body).toContain("Echte lamp")
    expect(draft.body).toContain("Gemaakt in Nederland.")
    expect(draft.body).not.toContain("Er is geen productafbeelding beschikbaar")
    expect(draft.body).not.toContain("Verified")
    expect(draft.body).not.toMatch(/data-em-approval|activation/)
    expect(draft.cta_label).toBe("Bekijk het aanbod")
    expect(draft.body).not.toMatch(/commissie/i)
  })

  it("mentions commission only when the affiliate setting is supplied", async () => {
    const draft = await new LocalContentProvider().generate({
      ...base,
      idea: "Nieuwe producten voor affiliate partners",
      products: [
        {
          title: "Echte lamp",
          description: "Gemaakt in Nederland.",
          image_url: null,
          commission_note: "Commissie: 5%.",
        },
      ],
    })
    expect(draft.body).toContain("Commissie: 5%.")
  })

  it("leaves technical catalog rows out of the newsletter", async () => {
    const draft = await new LocalContentProvider().generate({
      ...base,
      products: [
        {
          title: "E2E Product",
          description: "Beschrijving...",
          image_url: null,
        },
        {
          title: "Echte lamp",
          description: "Gemaakt in Nederland.",
          image_url: "https://europmade.eu/lamp.jpg",
        },
      ],
    })
    expect(draft.body).toContain("Echte lamp")
    expect(draft.body).toContain("https://europmade.eu/lamp.jpg")
    expect(draft.body).not.toContain("E2E Product")
    expect(draft.body).not.toContain("Beschrijving")
  })

  it("omits a product block when no usable product exists", async () => {
    const draft = await new LocalContentProvider().generate(base)
    expect(draft.body).toContain("<!--em-hero-->")
    expect(draft.body).not.toContain("<!--em-product-->")
    expect(draft.body).not.toContain("Er is geen productinformatie beschikbaar")
    expect(draft.body).not.toContain("Echte lamp")
  })

  it("shortens a product description without adding claims", () => {
    expect(
      draftProductSummary(
        "De loopwheeled trui is van zwaar katoen. Hij wordt in Portugal gemaakt. Een extra zin blijft weg."
      )
    ).toBe("De loopwheeled trui is van zwaar katoen. Hij wordt in Portugal gemaakt.")
    expect(draftProductSummary("Beschrijving...")).toBe("")
    expect(draftProductSummary("")).toBe("")
  })

  it("stays unavailable when the provider is turned off", async () => {
    const provider = createContentProviderFromEnv({ ENGAGEMENT_AI_PROVIDER: "none" })
    expect(provider).toBeInstanceOf(UnavailableContentProvider)
    await expect(provider.generate(base)).rejects.toThrow(/kon niet worden gemaakt/)
  })
})
