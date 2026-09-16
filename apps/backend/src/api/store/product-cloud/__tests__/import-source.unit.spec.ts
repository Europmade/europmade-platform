import { MedusaError } from "@medusajs/framework/utils"
import {
  assertImportSourceLanguage,
  importSourceTextFields,
} from "../import-helpers"
import { translationReviewLabel } from "../../../../modules/product-cloud/translation/status-labels"
import { shouldEnqueueTarget } from "../../../../modules/product-cloud/translation/workflow"
import { buildTranslationDocumentInputs } from "../../../../modules/product-cloud/translation/completeness"

describe("import source language and translation pairs", () => {
  it("requires an active Product Cloud source language", () => {
    expect(() => assertImportSourceLanguage("")).toThrow(MedusaError)
    expect(() => assertImportSourceLanguage("xx")).toThrow(MedusaError)
    expect(assertImportSourceLanguage("nl")).toBe("nl")
    expect(assertImportSourceLanguage("EN")).toBe("en")
    expect(assertImportSourceLanguage("de")).toBe("de")
  })

  it("exports title and description from general fields only", () => {
    const fields = importSourceTextFields({
      title: "Vaatwasser",
      description: "Met Zeolith 60 cm 220 V",
      title_en: "Must be ignored",
      description_en: "Must be ignored",
    })
    expect(fields.title).toBe("Vaatwasser")
    expect(fields.description).toContain("Zeolith")
    expect(fields).not.toHaveProperty("title_en")
  })

  it("requires title and description per target language", () => {
    const docs = buildTranslationDocumentInputs({
      source_language_code: "nl",
      translations: [
        {
          field_name: "title",
          language_code: "en",
          translation_status: "Gepubliceerd",
          value: "Dishwasher",
        },
        {
          field_name: "description",
          language_code: "en",
          translation_status: "Gepubliceerd",
          value: "With Zeolith 60 cm 220 V",
        },
        {
          field_name: "title",
          language_code: "de",
          translation_status: "Gepubliceerd",
          value: "Geschirrspüler",
        },
        {
          field_name: "description",
          language_code: "de",
          translation_status: "Gepubliceerd",
          value: "Mit Zeolith 60 cm 220 V",
        },
        {
          field_name: "title",
          language_code: "fr",
          translation_status: "Gepubliceerd",
          value: "Lave-vaisselle",
        },
        {
          field_name: "description",
          language_code: "fr",
          translation_status: "Gepubliceerd",
          value: "Avec Zeolith 60 cm 220 V",
        },
      ],
    })
    expect(docs.every((d) => d.status === "approved")).toBe(true)
  })

  it("flags a missing English description", () => {
    const docs = buildTranslationDocumentInputs({
      source_language_code: "nl",
      translations: [
        {
          field_name: "title",
          language_code: "en",
          translation_status: "Gepubliceerd",
          value: "Dishwasher",
        },
      ],
    })
    const en = docs.find((d) => d.code === "translation.en")
    expect(en?.status).toBe("pending_review")
    expect(en?.rejection_reason).toMatch(/description/)
  })

  it("does not overwrite a manual translation without force", () => {
    expect(
      shouldEnqueueTarget({
        existing_status: "Gepubliceerd",
        existing_origin: "manual",
        force_overwrite_manual: false,
        only_missing: true,
      })
    ).toEqual({ enqueue: false, skip_reason: "manual_override_protected" })
  })

  it("maps seller-facing review labels in text", () => {
    expect(translationReviewLabel("Machine", "machine")).toBe("AI-vertaald")
    expect(translationReviewLabel("Beoordeeld", "manual")).toBe(
      "Handmatig gecontroleerd"
    )
    expect(translationReviewLabel("Concept", "manual")).toBe("Handmatig aangepast")
    expect(translationReviewLabel("Gepubliceerd", "machine")).toBe("Goedgekeurd")
    expect(translationReviewLabel("Mislukt", "machine")).toBe(
      "Admincontrole nodig"
    )
  })

  it("requires title and description for an extra configured target language", () => {
    const prevActive = process.env.PRODUCT_CLOUD_ACTIVE_LANGUAGES
    const prevRequired = process.env.PRODUCT_CLOUD_REQUIRED_TARGET_LANGUAGES
    process.env.PRODUCT_CLOUD_ACTIVE_LANGUAGES = "nl,en,fr,de,es"
    process.env.PRODUCT_CLOUD_REQUIRED_TARGET_LANGUAGES = "en,fr,de,es"
    try {
      const docs = buildTranslationDocumentInputs({
        source_language_code: "nl",
        translations: [
          {
            field_name: "title",
            language_code: "es",
            translation_status: "Gepubliceerd",
            value: "Lavavajillas",
          },
        ],
      })
      const es = docs.find((d) => d.code === "translation.es")
      expect(es?.required).toBe(true)
      expect(es?.status).not.toBe("approved")
      expect(es?.rejection_reason).toMatch(/description/)
    } finally {
      if (prevActive === undefined) delete process.env.PRODUCT_CLOUD_ACTIVE_LANGUAGES
      else process.env.PRODUCT_CLOUD_ACTIVE_LANGUAGES = prevActive
      if (prevRequired === undefined) {
        delete process.env.PRODUCT_CLOUD_REQUIRED_TARGET_LANGUAGES
      } else {
        process.env.PRODUCT_CLOUD_REQUIRED_TARGET_LANGUAGES = prevRequired
      }
    }
  })
})
