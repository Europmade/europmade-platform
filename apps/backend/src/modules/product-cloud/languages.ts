/**
 * Centrale Product Cloud-taalconfig (ADR-0038 / ADR-0039).
 * Actieve MVP-talen: NL / EN / FR / DE. Bekende EU-codes zijn uitbreidbaar zonder herbouw.
 */

/** Talen waarvoor Product Cloud-vertalingen in MVP actief worden beheerd. */
export const PRODUCT_CLOUD_ACTIVE_LANGUAGES = ["nl", "en", "fr", "de"] as const

export type ProductCloudActiveLanguage =
  (typeof PRODUCT_CLOUD_ACTIVE_LANGUAGES)[number]

/**
 * Bekende / toekomstige EU-storefronttalen (uitbreidbaar).
 * Geen harde business-logica op individuele codes buiten deze module.
 */
export const PRODUCT_CLOUD_KNOWN_LANGUAGES = [
  "nl",
  "en",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "pl",
  "cs",
  "sk",
  "hu",
  "ro",
  "bg",
  "hr",
  "sl",
  "el",
  "da",
  "sv",
  "fi",
  "et",
  "lv",
  "lt",
  "ga",
  "mt",
] as const

export type ProductCloudKnownLanguage =
  (typeof PRODUCT_CLOUD_KNOWN_LANGUAGES)[number]

export function normalizeLanguageCode(code: string): string {
  return code.trim().toLowerCase().split(/[_-]/)[0] ?? ""
}

export function isKnownProductCloudLanguage(code: string): boolean {
  const n = normalizeLanguageCode(code)
  return (PRODUCT_CLOUD_KNOWN_LANGUAGES as readonly string[]).includes(n)
}

export function isActiveProductCloudLanguage(
  code: string
): code is ProductCloudActiveLanguage {
  const n = normalizeLanguageCode(code)
  return (PRODUCT_CLOUD_ACTIVE_LANGUAGES as readonly string[]).includes(n)
}

/** Alle actieve talen behalve de brontaal (generiek source → targets). */
export function targetLanguagesForSource(
  sourceLanguage: string,
  active: readonly string[] = PRODUCT_CLOUD_ACTIVE_LANGUAGES
): string[] {
  const source = normalizeLanguageCode(sourceLanguage)
  return active
    .map((c) => normalizeLanguageCode(c))
    .filter((c) => c && c !== source)
}

/**
 * Content-context voor de translation provider (ADR-0039).
 * product_* = betekenisgetrouw; website_* = natuurlijker marketing.
 */
export const PRODUCT_CLOUD_CONTENT_TYPES = [
  "product_title",
  "product_description",
  "product_attribute",
  "category_name",
  "category_buy_guide",
  "faq",
  "seo_title",
  "seo_description",
  "marketing_page",
  "website_copy",
] as const

export type ProductCloudContentType =
  (typeof PRODUCT_CLOUD_CONTENT_TYPES)[number]

export function isProductContentType(contentType?: string | null): boolean {
  if (!contentType) return true
  return (
    contentType.startsWith("product_") || contentType === "product_attribute"
  )
}

export function inferContentTypeFromField(
  fieldName: string
): ProductCloudContentType {
  switch (fieldName) {
    case "title":
      return "product_title"
    case "name":
      return "category_name"
    case "description":
    case "short_description":
    case "long_description":
      return "product_description"
    case "option_labels":
      return "product_attribute"
    case "seo_title":
      return "seo_title"
    case "seo_description":
      return "seo_description"
    case "faq_question":
    case "faq_answer":
      return "faq"
    case "buy_guide":
      return "category_buy_guide"
    default:
      return "website_copy"
  }
}

/**
 * Velden die wél machine-/handvertaald mogen worden.
 * Codes, EAN/GTIN, SKU en identifiers horen hier NIET in.
 */
export const PRODUCT_CLOUD_TRANSLATABLE_FIELDS = [
  "title",
  "description",
  "name",
  "short_description",
  "long_description",
  "benefits",
  "applications",
  "important_info",
  "maintenance",
  "warnings",
  "option_labels",
  "document_label",
  "use_case_label",
  "seo_title",
  "seo_description",
  "faq_question",
  "faq_answer",
  "buy_guide",
  "intro",
] as const

export type ProductCloudTranslatableField =
  (typeof PRODUCT_CLOUD_TRANSLATABLE_FIELDS)[number]

export function isTranslatableField(fieldName: string): boolean {
  return (PRODUCT_CLOUD_TRANSLATABLE_FIELDS as readonly string[]).includes(
    fieldName
  )
}

/** Velden / identifiers die nooit vertaald mogen worden. */
export const PRODUCT_CLOUD_NON_TRANSLATABLE_HINTS = [
  "code",
  "ean",
  "gtin",
  "sku",
  "mpn",
  "identifier",
  "identifier_value",
  "slug",
] as const
