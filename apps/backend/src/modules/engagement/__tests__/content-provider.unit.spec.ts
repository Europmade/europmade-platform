import {
  LocalContentProvider,
  UnavailableContentProvider,
  createContentProviderFromEnv,
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
  it("builds a draft from the request and does not invent a product", async () => {
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
    expect(draft.body).toContain("Echte lamp")
    expect(draft.body).toContain("Er is geen productafbeelding beschikbaar.")
    expect(draft.body).not.toContain("Verified")
    expect(draft.body).not.toMatch(/data-em-approval|active/)
  })

  it("says when product information is missing", async () => {
    const draft = await new LocalContentProvider().generate(base)
    expect(draft.body).toContain("Er is geen productinformatie beschikbaar")
    expect(draft.body).not.toContain("Echte lamp")
  })

  it("stays unavailable when the provider is turned off", async () => {
    const provider = createContentProviderFromEnv({ ENGAGEMENT_AI_PROVIDER: "none" })
    expect(provider).toBeInstanceOf(UnavailableContentProvider)
    await expect(provider.generate(base)).rejects.toThrow(/kon niet worden gemaakt/)
  })
})
