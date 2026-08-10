/**
 * Locale resolve + fallback helpers for pc_translation (ADR-0038 / ADR-0039).
 */

export type TranslationRowLike = {
  field_name: string
  language_code: string
  value: string
  source_language_code?: string | null
  source_value?: string | null
  translation_status: string
  origin?: string | null
  source_version?: number | null
}

export type LocalizedFieldResolution = {
  field_name: string
  locale: string
  value: string
  /** bron | translation | missing */
  source: "source" | "translation" | "missing"
  translation_status: string | null
  translation_exists: boolean
  translation_failed: boolean
  translation_stale: boolean
  origin: string | null
}

/** Storefront: alleen gepubliceerde vertalingen (ADR-0039). */
const STOREFRONT_STATUSES = new Set(["Gepubliceerd"])

/** Admin/preview: machine + beoordeeld + gepubliceerd. */
const PREVIEW_STATUSES = new Set(["Machine", "Beoordeeld", "Gepubliceerd"])

function normalize(code: string): string {
  return code.trim().toLowerCase().split(/[_-]/)[0] ?? ""
}

/**
 * Resolve one field for a locale.
 * Storefront mode: alleen Gepubliceerd; anders bron-fallback (pagina mag niet breken).
 */
export function resolveLocalizedField(input: {
  field_name: string
  locale: string
  source_value: string | null | undefined
  source_language_code?: string | null
  translations: TranslationRowLike[]
  /** default storefront = published-only */
  mode?: "storefront" | "preview"
}): LocalizedFieldResolution {
  const locale = normalize(input.locale)
  const sourceLang = input.source_language_code
    ? normalize(input.source_language_code)
    : null
  const sourceValue = input.source_value ?? ""
  const allowed =
    input.mode === "preview" ? PREVIEW_STATUSES : STOREFRONT_STATUSES

  if (sourceLang && locale === sourceLang && sourceValue) {
    return {
      field_name: input.field_name,
      locale,
      value: sourceValue,
      source: "source",
      translation_status: null,
      translation_exists: false,
      translation_failed: false,
      translation_stale: false,
      origin: null,
    }
  }

  const candidates = input.translations.filter(
    (t) =>
      t.field_name === input.field_name &&
      normalize(t.language_code) === locale
  )

  const usable = candidates.find(
    (t) =>
      allowed.has(t.translation_status) &&
      typeof t.value === "string" &&
      t.value.trim().length > 0
  )

  if (usable) {
    return {
      field_name: input.field_name,
      locale,
      value: usable.value,
      source: "translation",
      translation_status: usable.translation_status,
      translation_exists: true,
      translation_failed: false,
      translation_stale: false,
      origin: usable.origin ?? null,
    }
  }

  const stale = candidates.find((t) => t.translation_status === "Verouderd")
  const missingOrFailed = candidates.find(
    (t) =>
      t.translation_status === "Ontbreekt" ||
      t.translation_status === "Concept" ||
      t.translation_status === "Mislukt" ||
      t.translation_status === "Machine" ||
      t.translation_status === "Beoordeeld"
  )

  if (sourceValue) {
    return {
      field_name: input.field_name,
      locale,
      value: sourceValue,
      source: "source",
      translation_status:
        stale?.translation_status ??
        missingOrFailed?.translation_status ??
        null,
      translation_exists: Boolean(stale || missingOrFailed),
      translation_failed:
        missingOrFailed?.translation_status === "Mislukt" ||
        (missingOrFailed?.translation_status === "Ontbreekt" &&
          !(missingOrFailed.value ?? "").trim()),
      translation_stale: Boolean(stale),
      origin: stale?.origin ?? missingOrFailed?.origin ?? null,
    }
  }

  return {
    field_name: input.field_name,
    locale,
    value: "",
    source: "missing",
    translation_status:
      stale?.translation_status ?? missingOrFailed?.translation_status ?? null,
    translation_exists: Boolean(stale || missingOrFailed),
    translation_failed: true,
    translation_stale: Boolean(stale),
    origin: stale?.origin ?? missingOrFailed?.origin ?? null,
  }
}

export function resolveLocalizedFields(input: {
  locale: string
  source_language_code?: string | null
  source_fields: Record<string, string>
  translations: TranslationRowLike[]
  mode?: "storefront" | "preview"
}): LocalizedFieldResolution[] {
  return Object.entries(input.source_fields).map(([field_name, source_value]) =>
    resolveLocalizedField({
      field_name,
      locale: input.locale,
      source_value,
      source_language_code: input.source_language_code,
      translations: input.translations,
      mode: input.mode,
    })
  )
}
