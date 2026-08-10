import {
  isActiveProductCloudLanguage,
  isTranslatableField,
  normalizeLanguageCode,
  targetLanguagesForSource,
  PRODUCT_CLOUD_ACTIVE_LANGUAGES,
  inferContentTypeFromField,
} from "../languages"
import { buildLanguageCoverage, pickTranslationVersion } from "../translation/coverage"
import { translationStatusUiLabel } from "../translation/status-labels"
import {
  createTranslationProviderFromEnv,
  NullTranslationProvider,
  resetTranslationProviderCache,
  TranslationProviderNotConfiguredError,
} from "../translation/provider"
import { DeepLTranslationProvider } from "../translation/deepl-provider"
import { resolveLocalizedField } from "../translation/resolve"
import {
  extractTechnicalTokens,
  validateTechnicalTokensPreserved,
} from "../translation/technical-tokens"
import {
  isManualOverrideProtected,
  shouldEnqueueTarget,
  shouldMarkTranslationStale,
} from "../translation/workflow"
import { sellerOwnsProduct } from "../translation/ownership"


describe("translation status UI labels + coverage", () => {
  it("maps backend statuses to sprint UI labels", () => {
    expect(translationStatusUiLabel("Concept")).toBe("In wachtrij")
    expect(translationStatusUiLabel("Machine")).toBe("Bezig")
    expect(translationStatusUiLabel("Gepubliceerd")).toBe("Beschikbaar")
    expect(translationStatusUiLabel("Mislukt")).toBe("Mislukt")
  })

  it("builds DE source → NL/EN/FR coverage including missing", () => {
    const coverage = buildLanguageCoverage({
      source_language_code: "de",
      translations: [
        {
          field_name: "title",
          language_code: "nl",
          translation_status: "Gepubliceerd",
        },
        {
          field_name: "title",
          language_code: "en",
          translation_status: "Mislukt",
        },
      ],
    })
    expect(coverage.source_language_code).toBe("de")
    expect(coverage.targets.map((t) => t.language_code)).toEqual([
      "nl",
      "en",
      "fr",
    ])
    expect(coverage.targets.find((t) => t.language_code === "nl")?.ui_status).toBe(
      "Beschikbaar"
    )
    expect(coverage.targets.find((t) => t.language_code === "en")?.ui_status).toBe(
      "Mislukt"
    )
    expect(coverage.targets.find((t) => t.language_code === "fr")?.ui_status).toBe(
      "Ontbreekt"
    )
  })

  it("aggregates worst status across fields for a language", () => {
    const coverage = buildLanguageCoverage({
      source_language_code: "nl",
      translations: [
        {
          field_name: "title",
          language_code: "en",
          translation_status: "Gepubliceerd",
        },
        {
          field_name: "description",
          language_code: "en",
          translation_status: "Verouderd",
        },
      ],
    })
    expect(coverage.targets.find((t) => t.language_code === "en")?.ui_status).toBe(
      "Verouderd"
    )
  })

  it("picks Concept version over older published", () => {
    const version = pickTranslationVersion([
      {
        publication_status: "Gepubliceerd",
        version_number: 1,
      },
      {
        publication_status: "Concept",
        version_number: 2,
      },
    ])
    expect(version?.version_number).toBe(2)
  })
})

describe("Product Cloud languages (ADR-0039)", () => {
  it("exposes NL/EN/FR/DE as active and computes generic targets", () => {
    expect([...PRODUCT_CLOUD_ACTIVE_LANGUAGES]).toEqual([
      "nl",
      "en",
      "fr",
      "de",
    ])
    expect(targetLanguagesForSource("de")).toEqual(["nl", "en", "fr"])
    expect(targetLanguagesForSource("NL")).toEqual(["en", "fr", "de"])
    expect(targetLanguagesForSource("en")).toEqual(["nl", "fr", "de"])
    expect(targetLanguagesForSource("fr")).toEqual(["nl", "en", "de"])
    expect(isActiveProductCloudLanguage("en")).toBe(true)
    expect(normalizeLanguageCode("en-GB")).toBe("en")
  })

  it("does not treat codes/EAN as translatable fields", () => {
    expect(isTranslatableField("title")).toBe(true)
    expect(isTranslatableField("code")).toBe(false)
    expect(isTranslatableField("ean")).toBe(false)
    expect(inferContentTypeFromField("title")).toBe("product_title")
    expect(inferContentTypeFromField("buy_guide")).toBe("category_buy_guide")
  })
})

describe("Product Cloud translation resolve (ADR-0039)", () => {
  it("storefront uses only Gepubliceerd translations", () => {
    const machineOnly = resolveLocalizedField({
      field_name: "title",
      locale: "en",
      source_value: "Hallo",
      source_language_code: "nl",
      mode: "storefront",
      translations: [
        {
          field_name: "title",
          language_code: "en",
          value: "Hello",
          translation_status: "Machine",
        },
      ],
    })
    expect(machineOnly.source).toBe("source")
    expect(machineOnly.value).toBe("Hallo")

    const published = resolveLocalizedField({
      field_name: "title",
      locale: "en",
      source_value: "Hallo",
      source_language_code: "nl",
      mode: "storefront",
      translations: [
        {
          field_name: "title",
          language_code: "en",
          value: "Hello",
          translation_status: "Gepubliceerd",
          origin: "machine",
        },
      ],
    })
    expect(published.source).toBe("translation")
    expect(published.value).toBe("Hello")
  })

  it("falls back to source when translation missing", () => {
    const result = resolveLocalizedField({
      field_name: "title",
      locale: "de",
      source_value: "Hallo",
      source_language_code: "nl",
      translations: [
        {
          field_name: "title",
          language_code: "de",
          value: "",
          translation_status: "Ontbreekt",
        },
      ],
    })
    expect(result.source).toBe("source")
    expect(result.value).toBe("Hallo")
    expect(result.translation_failed).toBe(true)
  })

  it("marks stale translations without using them on storefront", () => {
    const result = resolveLocalizedField({
      field_name: "title",
      locale: "fr",
      source_value: "Hallo",
      source_language_code: "nl",
      mode: "storefront",
      translations: [
        {
          field_name: "title",
          language_code: "fr",
          value: "Bonjour (oud)",
          translation_status: "Verouderd",
          origin: "manual",
        },
      ],
    })
    expect(result.source).toBe("source")
    expect(result.translation_stale).toBe(true)
    expect(result.origin).toBe("manual")
    expect(result.value).toBe("Hallo")
  })

  it("supports language matrix source fallbacks", () => {
    const pairs: Array<[string, string]> = [
      ["nl", "en"],
      ["en", "nl"],
      ["de", "nl"],
      ["fr", "en"],
    ]
    for (const [source, target] of pairs) {
      const result = resolveLocalizedField({
        field_name: "title",
        locale: target,
        source_value: `text-${source}`,
        source_language_code: source,
        translations: [],
      })
      expect(result.value).toBe(`text-${source}`)
      expect(result.source).toBe("source")
    }
  })
})

describe("technical tokens (ADR-0039)", () => {
  it("preserves numbers and units", () => {
    const source = "Suitable for rooms up to 50 m² and 1200 W"
    expect(extractTechnicalTokens(source).length).toBeGreaterThan(0)
    expect(
      validateTechnicalTokensPreserved(
        source,
        "Geschikt voor kamers tot 50 m² en 1200 W"
      )
    ).toBeNull()
    expect(
      validateTechnicalTokensPreserved(source, "Geschikt voor kamers tot 60 m²")
    ).toMatch(/technical_token_missing/)
  })
})

describe("Product Cloud translation provider (ADR-0039)", () => {
  afterEach(() => {
    resetTranslationProviderCache()
  })

  it("defaults to null provider without credentials", async () => {
    const provider = createTranslationProviderFromEnv({
      PRODUCT_CLOUD_TRANSLATION_PROVIDER: "none",
    } as NodeJS.ProcessEnv)
    expect(provider).toBeInstanceOf(NullTranslationProvider)
    await expect(
      provider.translate({
        text: "Hallo",
        source_language: "nl",
        target_language: "en",
      })
    ).rejects.toBeInstanceOf(TranslationProviderNotConfiguredError)
  })

  it("selects DeepL when provider+key are set (no network call)", () => {
    const provider = createTranslationProviderFromEnv({
      PRODUCT_CLOUD_TRANSLATION_PROVIDER: "deepl",
      PRODUCT_CLOUD_TRANSLATION_API_KEY: "test-key",
    } as NodeJS.ProcessEnv)
    expect(provider).toBeInstanceOf(DeepLTranslationProvider)
    expect(provider.id).toBe("deepl")
  })

  it("does not invent deepl output without a key", () => {
    const provider = createTranslationProviderFromEnv({
      PRODUCT_CLOUD_TRANSLATION_PROVIDER: "deepl",
      PRODUCT_CLOUD_TRANSLATION_API_KEY: "",
    } as NodeJS.ProcessEnv)
    expect(provider.id).toBe("none")
  })

  it("treats missing API key as not configured (clear failure path)", async () => {
    const provider = createTranslationProviderFromEnv({
      PRODUCT_CLOUD_TRANSLATION_PROVIDER: "deepl",
      PRODUCT_CLOUD_TRANSLATION_API_KEY: "   ",
    } as NodeJS.ProcessEnv)
    expect(provider).toBeInstanceOf(NullTranslationProvider)
    await expect(
      provider.translate({
        text: "Hallo",
        source_language: "nl",
        target_language: "en",
      })
    ).rejects.toThrow(/PRODUCT_CLOUD_TRANSLATION/)
  })
})

describe("Product Cloud translation workflow helpers (ADR-0039)", () => {
  it("DE source → NL/EN/FR targets; NL source → EN/DE/FR", () => {
    expect(targetLanguagesForSource("de")).toEqual(["nl", "en", "fr"])
    expect(targetLanguagesForSource("nl").sort()).toEqual(
      ["en", "de", "fr"].sort()
    )
  })

  it("marks missing translation as Ontbreekt-eligible for enqueue", () => {
    expect(
      shouldEnqueueTarget({
        existing_status: null,
        only_missing: true,
      }).enqueue
    ).toBe(true)
    expect(
      shouldEnqueueTarget({
        existing_status: "Ontbreekt",
        only_missing: true,
      }).enqueue
    ).toBe(true)
    expect(
      shouldEnqueueTarget({
        existing_status: "Gepubliceerd",
        only_missing: true,
      })
    ).toEqual({ enqueue: false, skip_reason: "not_missing" })
  })

  it("marks translation Verouderd when source_version advances", () => {
    expect(
      shouldMarkTranslationStale({
        translation_status: "Gepubliceerd",
        source_version: 1,
        new_source_version: 2,
      })
    ).toBe(true)
    expect(
      shouldMarkTranslationStale({
        translation_status: "Machine",
        source_version: 2,
        new_source_version: 2,
      })
    ).toBe(false)
    expect(
      shouldMarkTranslationStale({
        translation_status: "Ontbreekt",
        source_version: 1,
        new_source_version: 99,
      })
    ).toBe(false)
    expect(
      shouldMarkTranslationStale({
        translation_status: "Mislukt",
        source_version: 1,
        new_source_version: 99,
      })
    ).toBe(false)
  })

  it("protects manual origin from automatic overwrite", () => {
    expect(isManualOverrideProtected("manual", false)).toBe(true)
    expect(isManualOverrideProtected("manual", true)).toBe(false)
    expect(isManualOverrideProtected("machine", false)).toBe(false)
    expect(
      shouldEnqueueTarget({
        existing_status: "Gepubliceerd",
        existing_origin: "manual",
        only_stale: true,
      })
    ).toEqual({ enqueue: false, skip_reason: "manual_override_protected" })
  })

  it("allows machine row to be replaced by later manual (origin contract)", () => {
    // Manual save uses origin=manual + force_overwrite_manual; enqueue without force skips it.
    expect(
      shouldEnqueueTarget({
        existing_origin: "machine",
        existing_status: "Machine",
      }).enqueue
    ).toBe(true)
    expect(
      shouldEnqueueTarget({
        existing_origin: "manual",
        existing_status: "Beoordeeld",
        force_overwrite_manual: false,
      }).enqueue
    ).toBe(false)
  })

  it("retranslate only_stale / only_failed filters", () => {
    expect(
      shouldEnqueueTarget({
        existing_status: "Verouderd",
        existing_origin: "machine",
        only_stale: true,
      }).enqueue
    ).toBe(true)
    expect(
      shouldEnqueueTarget({
        existing_status: "Gepubliceerd",
        existing_origin: "machine",
        only_stale: true,
      }).skip_reason
    ).toBe("not_stale")
    expect(
      shouldEnqueueTarget({
        existing_status: "Mislukt",
        existing_origin: "machine",
        only_failed: true,
      }).enqueue
    ).toBe(true)
    expect(
      shouldEnqueueTarget({
        existing_status: "Machine",
        existing_origin: "machine",
        only_failed: true,
      }).skip_reason
    ).toBe("not_failed")
    // Combined OR: stale or failed
    expect(
      shouldEnqueueTarget({
        existing_status: "Mislukt",
        existing_origin: "machine",
        only_stale: true,
        only_failed: true,
      }).enqueue
    ).toBe(true)
  })
})

describe("manual override protection (logic)", () => {
  it("documents that origin=manual must not be overwritten without force", () => {
    expect(isManualOverrideProtected("manual", false)).toBe(true)
  })
})

describe("seller ownership for translations", () => {
  it("allows only the owning seller", () => {
    expect(sellerOwnsProduct("sel_a", "sel_a")).toBe(true)
    expect(sellerOwnsProduct("sel_a", "sel_b")).toBe(false)
    expect(sellerOwnsProduct(null, "sel_a")).toBe(false)
  })
})
