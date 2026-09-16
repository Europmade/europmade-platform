/**
 * Translation completeness for product publish gates (ADR-0039).
 * Storefront-ready = Gepubliceerd with non-empty value.
 * Required MVP fields for product_version: title + description.
 */

import {
  normalizeLanguageCode,
  requiredTargetLanguagesForSource,
} from "../languages"
import type { CompletenessDocumentInput } from "../completeness"

export const PRODUCT_VERSION_REQUIRED_TRANSLATION_FIELDS = [
  "title",
  "description",
] as const

export type TranslationCompletenessRow = {
  field_name: string
  language_code: string
  translation_status: string
  value?: string | null
}

function isStorefrontReady(row: TranslationCompletenessRow | undefined): boolean {
  if (!row) return false
  if (row.translation_status !== "Gepubliceerd") return false
  return Boolean((row.value || "").trim())
}

/**
 * One completeness document per target language (source language excluded).
 */
export function buildTranslationDocumentInputs(opts: {
  source_language_code: string | null | undefined
  translations: TranslationCompletenessRow[]
  required_fields?: readonly string[]
}): CompletenessDocumentInput[] {
  const source = opts.source_language_code
    ? normalizeLanguageCode(opts.source_language_code)
    : "nl"
  const required = opts.required_fields?.length
    ? opts.required_fields
    : PRODUCT_VERSION_REQUIRED_TRANSLATION_FIELDS
  const targets = requiredTargetLanguagesForSource(source)

  return targets.map((language_code) => {
    const langRows = opts.translations.filter(
      (t) => normalizeLanguageCode(t.language_code) === language_code
    )
    const fieldReady = required.map((field) => {
      const row = langRows.find((r) => r.field_name === field)
      return { field, ready: isStorefrontReady(row), row }
    })
    const allReady = fieldReady.every((f) => f.ready)
    const anyRow = langRows.length > 0
    const anyFailed = langRows.some(
      (r) =>
        r.translation_status === "Mislukt" ||
        r.translation_status === "Verouderd"
    )
    const anyInProgress = langRows.some((r) =>
      ["Concept", "Machine", "Beoordeeld"].includes(r.translation_status)
    )

    let status: CompletenessDocumentInput["status"] = "missing"
    if (allReady) status = "approved"
    else if (anyFailed && !fieldReady.some((f) => f.ready)) status = "rejected"
    else if (anyInProgress || anyRow) status = "pending_review"
    else status = "missing"

    const missingFields = fieldReady
      .filter((f) => !f.ready)
      .map((f) => f.field)
      .join(", ")

    return {
      code: `translation.${language_code}`,
      name: `Vertaling ${language_code.toUpperCase()}`,
      required: true,
      present: anyRow || allReady,
      status,
      rejection_reason:
        status === "approved"
          ? null
          : missingFields
            ? `Ontbrekende of niet-gepubliceerde velden: ${missingFields}`
            : null,
    }
  })
}
