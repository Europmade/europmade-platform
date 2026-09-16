import {
  buildTranslationDocumentInputs,
  PRODUCT_VERSION_REQUIRED_TRANSLATION_FIELDS,
} from "../translation/completeness"

describe("translation completeness gate", () => {
  afterEach(() => {
    delete process.env.PRODUCT_CLOUD_ACTIVE_LANGUAGES
    delete process.env.PRODUCT_CLOUD_REQUIRED_TARGET_LANGUAGES
  })

  it("blocks when target languages missing title/description", () => {
    const docs = buildTranslationDocumentInputs({
      source_language_code: "nl",
      translations: [],
    })
    expect(docs.map((d) => d.code).sort()).toEqual([
      "translation.de",
      "translation.en",
      "translation.fr",
    ])
    expect(docs.every((d) => d.required && d.status === "missing")).toBe(true)
  })

  it("approves a language only when title+description are Gepubliceerd", () => {
    const docs = buildTranslationDocumentInputs({
      source_language_code: "nl",
      translations: [
        {
          field_name: "title",
          language_code: "en",
          translation_status: "Gepubliceerd",
          value: "English title",
        },
        {
          field_name: "description",
          language_code: "en",
          translation_status: "Beoordeeld",
          value: "English body",
        },
        {
          field_name: "title",
          language_code: "fr",
          translation_status: "Gepubliceerd",
          value: "Titre",
        },
        {
          field_name: "description",
          language_code: "fr",
          translation_status: "Gepubliceerd",
          value: "Description FR",
        },
        {
          field_name: "title",
          language_code: "de",
          translation_status: "Gepubliceerd",
          value: "Titel",
        },
        {
          field_name: "description",
          language_code: "de",
          translation_status: "Gepubliceerd",
          value: "Beschreibung",
        },
      ],
    })
    const by = Object.fromEntries(docs.map((d) => [d.code, d.status]))
    expect(by["translation.en"]).toBe("pending_review")
    expect(by["translation.fr"]).toBe("approved")
    expect(by["translation.de"]).toBe("approved")
  })

  it("does not treat a language as complete when only the title exists", () => {
    const docs = buildTranslationDocumentInputs({
      source_language_code: "nl",
      translations: [
        {
          field_name: "title",
          language_code: "en",
          translation_status: "Gepubliceerd",
          value: "English title only",
        },
      ],
    })
    const en = docs.find((d) => d.code === "translation.en")
    expect(en?.status).not.toBe("approved")
    expect(en?.rejection_reason).toMatch(/description/)
  })

  it("requires only configured product fields", () => {
    expect([...PRODUCT_VERSION_REQUIRED_TRANSLATION_FIELDS]).toEqual([
      "title",
      "description",
    ])
  })

  it("supports required target expansion via central env config", () => {
    process.env.PRODUCT_CLOUD_ACTIVE_LANGUAGES = "nl,en,fr,de,es,it"
    process.env.PRODUCT_CLOUD_REQUIRED_TARGET_LANGUAGES = "en,fr,de,es,it"
    const docs = buildTranslationDocumentInputs({
      source_language_code: "nl",
      translations: [],
    })
    expect(docs.map((d) => d.code).sort()).toEqual([
      "translation.de",
      "translation.en",
      "translation.es",
      "translation.fr",
      "translation.it",
    ])
  })
})
