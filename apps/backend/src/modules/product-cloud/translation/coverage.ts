/**
 * Per-language translation coverage for a product_version (ADR-0039).
 */

import {
  getActiveProductCloudLanguages,
  normalizeLanguageCode,
  targetLanguagesForSource,
} from "../languages"
import {
  translationReviewLabel,
  translationStatusUiLabel,
  worstTranslationStatus,
  type BackendTranslationStatus,
  type TranslationUiStatusLabel,
} from "./status-labels"

export type CoverageTranslationRow = {
  field_name: string
  language_code: string
  translation_status: string
  value?: string
  origin?: string | null
  source_version?: number | null
  translation_version?: number | null
}

export type LanguageCoverage = {
  language_code: string
  translation_status: BackendTranslationStatus
  ui_status: TranslationUiStatusLabel
  review_label: ReturnType<typeof translationReviewLabel>
  field_count: number
  has_manual: boolean
  missing_fields: string[]
}

export function buildLanguageCoverage(input: {
  source_language_code?: string | null
  translations: CoverageTranslationRow[]
  active_languages?: readonly string[]
}): {
  source_language_code: string | null
  targets: LanguageCoverage[]
} {
  const source = input.source_language_code
    ? normalizeLanguageCode(input.source_language_code)
    : null
  const active = input.active_languages ?? getActiveProductCloudLanguages()
  const targets = source
    ? targetLanguagesForSource(source, active)
    : active.map((c) => normalizeLanguageCode(c)).filter(Boolean)

  return {
    source_language_code: source,
    targets: targets.map((language_code) => {
      const rows = input.translations.filter(
        (t) => normalizeLanguageCode(t.language_code) === language_code
      )
      const status = rows.length
        ? worstTranslationStatus(rows.map((r) => r.translation_status))
        : ("Ontbreekt" as BackendTranslationStatus)
      const required = ["title", "description"]
      const missing_fields = required.filter((field) => {
        const row = rows.find((r) => r.field_name === field)
        return !row || !String(row.value || "").trim()
      })
      const origin = rows.find((r) => r.origin)?.origin ?? null
      return {
        language_code,
        translation_status: status,
        ui_status: translationStatusUiLabel(status),
        review_label: translationReviewLabel(status, origin),
        field_count: rows.length,
        has_manual: rows.some((r) => r.origin === "manual"),
        missing_fields,
      }
    }),
  }
}

/**
 * Working version for translation management:
 * active Concept/In review, else highest version_number.
 */
export function pickTranslationVersion<
  T extends { publication_status: string; version_number: number },
>(versions: T[]): T | null {
  if (!versions.length) return null
  const draft = versions.find(
    (v) =>
      v.publication_status === "Concept" ||
      v.publication_status === "In review"
  )
  if (draft) return draft
  return [...versions].sort((a, b) => b.version_number - a.version_number)[0]!
}
