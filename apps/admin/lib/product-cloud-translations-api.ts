/**
 * Admin Product Cloud translations API client.
 */

import { adminFetch } from "./admin-fetch"

export class ProductCloudTranslationsApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ProductCloudTranslationsApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw."
    throw new ProductCloudTranslationsApiError(message, response.status)
  }
  return body as T
}

export type LanguageCoverage = {
  language_code: string
  translation_status: string
  ui_status: string
  review_label?: string
  field_count: number
  has_manual: boolean
  missing_fields?: string[]
}

export type OverviewItem = {
  product_id: string
  current_owner_seller_id: string
  lifecycle_status: string
  version_id: string
  title: string
  source_language_code: string | null
  targets: LanguageCoverage[]
  attention_count: number
}

export type TranslationRow = {
  id: string
  entity_type: string
  entity_id: string
  field_name: string
  language_code: string
  value: string
  source_language_code?: string | null
  source_value?: string | null
  translation_status: string
  translation_version?: number
  source_version?: number
  origin?: string
  updated_by?: string | null
  updated_at?: string
  created_at?: string
}

export function listTranslationOverview(limit = 50) {
  return request<{
    items: OverviewItem[]
    count: number
    provider_id: string
    machine_translation_active: boolean
    provider_message: string | null
  }>(`/admin/product-cloud/translations/overview?limit=${limit}`)
}

export function listTranslations(entityType: string, entityId: string) {
  const q = new URLSearchParams({
    entity_type: entityType,
    entity_id: entityId,
  })
  return request<{ translations: TranslationRow[] }>(
    `/admin/product-cloud/translations?${q}`
  )
}

export function getTranslationSummary(versionId: string) {
  const q = new URLSearchParams({
    entity_type: "product_version",
    entity_id: versionId,
  })
  return request<{
    version: {
      id: string
      product_id: string
      title: string
      description: string
      source_language_code: string | null
      version_number: number
      publication_status: string
    }
    source_language_code: string | null
    targets: LanguageCoverage[]
    translations: TranslationRow[]
    provider_id: string
    provider_configured: boolean
    machine_translation_active: boolean
  }>(`/admin/product-cloud/translations/summary?${q}`)
}

export function saveManualTranslation(input: {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  field_name: string
  language_code: string
  value: string
  source_language_code?: string | null
  source_value?: string | null
  source_version?: number
  publish?: boolean
  updated_by?: string | null
}) {
  return request<{ translation: TranslationRow }>(
    "/admin/product-cloud/translations/manual",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function publishTranslation(input: {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  field_name: string
  language_code: string
  updated_by?: string | null
}) {
  return request<{ translation: TranslationRow }>(
    "/admin/product-cloud/translations/publish",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function markTranslationsStale(input: {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  new_source_version: number
  field_names?: string[]
}) {
  return request<{ marked: number; translations: TranslationRow[] }>(
    "/admin/product-cloud/translations/mark-stale",
    { method: "POST", body: JSON.stringify(input) }
  )
}

export function retranslate(input: {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  source_language_code: string
  source_fields: Record<string, string>
  target_language_code?: string
  only_stale?: boolean
  only_missing?: boolean
  only_failed?: boolean
  force_overwrite_manual?: boolean
}) {
  return request<{
    provider_id: string
    provider_configured: boolean
    results: Array<{
      field_name: string
      language_code: string
      translation_status: string
      skipped?: boolean
      error?: string
    }>
  }>("/admin/product-cloud/translations/retranslate", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function enqueueTranslations(input: {
  entity_type: "product_version" | "category" | "attribute_definition"
  entity_id: string
  source_language_code: string
  source_fields: Record<string, string>
  only_missing?: boolean
  only_stale?: boolean
  only_failed?: boolean
}) {
  return request<{
    provider_id: string
    provider_configured: boolean
    results: Array<{
      field_name: string
      language_code: string
      translation_status: string
      error?: string
    }>
    provider_message?: string
  }>("/admin/product-cloud/translations/enqueue", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/** UI label for backend status (NL admin UI). */
export function uiStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "Concept":
      return "In wachtrij"
    case "Machine":
      return "Bezig"
    case "Gepubliceerd":
      return "Beschikbaar"
    case "Ontbreekt":
    case "Beoordeeld":
    case "Verouderd":
    case "Mislukt":
      return status
    default:
      return status ? status : "Ontbreekt"
  }
}

/** Review label (tekst, niet alleen kleur) — zelfde mapping als Product Cloud. */
export function reviewStatusLabel(
  status: string | null | undefined,
  origin?: string | null
): string {
  const s = status || "Ontbreekt"
  if (s === "Gepubliceerd") return "Goedgekeurd"
  if (s === "Beoordeeld" && origin === "manual") return "Handmatig gecontroleerd"
  if (origin === "manual") return "Handmatig aangepast"
  if (s === "Machine" || s === "Concept") return "AI-vertaald"
  return "Admincontrole nodig"
}
