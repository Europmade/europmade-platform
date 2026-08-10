/**
 * @europmade/types — gedeelde TypeScript-types.
 *
 * Product Cloud surface types (ADR-0037). Commerce/Offer types blijven
 * gescheiden — Offer verwijst nooit naar product_id.
 */

/** Ondersteunde landen bij MVP-lancering (Blueprint H14.10). */
export type SupportedCountry = "NL" | "BE" | "DE" | "FR" | "ES" | "IT"

/** Generieke, discriminated-union resultaatwrapper. */
export type Result<TData, TError = string> =
  | { success: true; data: TData }
  | { success: false; error: TError }

/**
 * AI Content Engine entity surface (ADR-0036).
 */
export type AiContentEntityType =
  | "category"
  | "brand"
  | "producer"
  | "collection"
  | "campaign"
  | "landing"
  | "search"
  | "seller"

/** MVP + next EU storefront languages for Product Cloud translations. */
export type ProductCloudLanguageCode = "nl" | "fr" | "de" | "en"

/** Active Product Cloud translation languages (ADR-0039) — NL/EN/FR/DE. */
export const PRODUCT_CLOUD_ACTIVE_LANGUAGES = ["nl", "en", "fr", "de"] as const

export type ProductCloudActiveLanguage =
  (typeof PRODUCT_CLOUD_ACTIVE_LANGUAGES)[number]

export type ProductCloudIdentifierType = "GTIN" | "MPN"

export type ProductCloudAttributeDataType =
  | "Numeriek"
  | "Keuzelijst"
  | "Tekst-met-eenheid"

export type ProductCloudTranslationStatus =
  | "Ontbreekt"
  | "Concept"
  | "Machine"
  | "Beoordeeld"
  | "Gepubliceerd"
  | "Verouderd"
  | "Mislukt"

export type ProductCloudTranslationOrigin = "machine" | "manual"

export type ProductCloudLocalizedFieldResolution = {
  field_name: string
  locale: string
  value: string
  source: "source" | "translation" | "missing"
  translation_status: ProductCloudTranslationStatus | string | null
  translation_exists: boolean
  translation_failed: boolean
  translation_stale?: boolean
  origin?: ProductCloudTranslationOrigin | string | null
}

export type ProductCloudRelationType =
  | "Vergelijkbaar"
  | "Accessoire"
  | "Gerelateerd"
  | "VaakSamenGekocht"
  | "Alternatief"

export type ProductCloudDocumentType =
  | "CE-certificaat"
  | "Overig compliance-document"
  | "Autorisatiebewijs"
  | "Handleiding"
  | "Veiligheidsinformatieblad"
  | "Garantiebewijs"
  | "Conformiteitsverklaring"

/** Central product identity — never contains price/stock/seller offer fields. */
export type ProductCloudProductIdentity = {
  id: string
  brand_id: string
  manufacturer_id: string
  lifecycle_status: string
  category_ids: string[]
}

export type ProductCloudAttributeDefinition = {
  id: string
  category_id: string
  code: string | null
  name: string
  data_type: ProductCloudAttributeDataType
  is_required: boolean
  unit: string | null
  is_filterable: boolean
  is_comparable: boolean
  sort_order: number
  option_values: string | null
}

export type ProductCloudAttributeValue = {
  id: string
  product_version_id: string
  attribute_definition_id: string
  value: string
}

export type ProductCloudTranslation = {
  id: string
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  field_name: string
  language_code: ProductCloudLanguageCode | string
  value: string
  source_language_code: string | null
  source_value: string | null
  translation_status: ProductCloudTranslationStatus
  translation_version: number
  source_version?: number
  origin?: ProductCloudTranslationOrigin
  updated_by?: string | null
}

export type ProductCloudCategorySummary = {
  id: string
  name: string
  slug: string | null
  parent_category_id: string | null
  attributes: Array<{
    id: string
    code: string | null
    name: string
    data_type: ProductCloudAttributeDataType
    unit: string | null
    is_required: boolean
    is_filterable: boolean
    is_comparable: boolean
    sort_order: number
    option_values: string | null
  }>
}

/**
 * Use-case tags on product_version (JSON) — architecture for toplists.
 * Ranking is NOT computed here.
 */
export type ProductCloudUseCaseTag =
  | "best"
  | "value"
  | "premium"
  | "student"
  | "family"
  | "business"
  | "budget"
  | "travel"
  | "pets"
  | "professional"
