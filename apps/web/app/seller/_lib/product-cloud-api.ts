/**
 * Store Product Cloud-client — S3-03-05 (ADR-0013 previews).
 * Zelfde fetch-patroon als partner-onboarding-api (credentials + publishable key).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class ProductCloudApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ProductCloudApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
      ...init.headers,
    },
  })

  const body: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw."
    throw new ProductCloudApiError(message, response.status)
  }

  return body as T
}

export type ProductCloudPreview = {
  product_id: string
  title: string | null
  brand_id: string
  manufacturer_id: string
  lifecycle_status: string
  category_names: string[]
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
}

export type CompletenessReport = {
  percent: number
  publishable: boolean
  information_quality?: "insufficient" | "sufficient" | "complete"
  publication_blocked_reasons: string[]
  sale_blocked_reasons?: string[]
  compliance_status:
    | "complete"
    | "incomplete"
    | "non_compliant"
    | "not_applicable"
    | "pending_review"
    | "rejected"
  compliance_review_status?:
    | "missing"
    | "pending_review"
    | "precheck_warning"
    | "approved"
    | "rejected"
    | "not_required"
  product_gate_status?:
    | "not_sellable"
    | "ready_for_review"
    | "in_review"
    | "publishable"
    | "published"
  sale_presentation?:
    | "for_sale"
    | "blocked"
    | "paused"
    | "no_offer"
    | "not_published"
  documents?: Array<{
    code: string
    name: string
    required: boolean
    present: boolean
    status: string
    rejection_reason?: string | null
  }>
  missing_required: Array<{ code: string; name: string; group: string }>
  sections: Array<{
    key: string
    label: string
    filled: number
    total: number
  }>
}

export type SellerOfferSummary = {
  offer_id: string | null
  identifier_id: string | null
  price: number | null
  shipping_cost: number | null
  stock: number | null
  region_code: string | null
  seller_sku?: string | null
  sales_status?: "active" | "paused" | null
  delivery_days_max?: number | null
  is_sellable?: boolean
  has_offer: boolean
  effective_unit_price?: number | null
  total_customer_price?: number | null
}

export type SellerOffersAggregate = {
  offer_count: number
  sku_display: string | null
  stock_total: number | null
  price: number | null
  sales_status: "active" | "paused" | "mixed" | null
  is_sellable: boolean
  delivery_days_max: number | null
  primary_offer_id: string | null
}

export type CatalogProduct = {
  id: string
  brand_id: string
  brand_name?: string | null
  manufacturer_id: string
  lifecycle_status: string
  current_owner_seller_id: string
  title: string | null
  description?: string | null
  category_names: string[]
  primary_image_url?: string | null
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
  publication_status?: string | null
  version_id?: string | null
  approval_status?: string | null
  approval_rejection_reason?: string | null
  approval_requested_at?: string | null
  workflow_status?: string | null
  variant_count?: number
  regular_customer_price?: number | null
  offer?: SellerOfferSummary
  offers?: SellerOffersAggregate
  completeness?: CompletenessReport
  sku_hint?: string | null
  actions?: Record<string, boolean>
}

export type ProductManagerDetail = CatalogProduct & {
  working_version?: {
    id: string
    title: string
    description: string
    publication_status: string
    version_number: number
  } | null
  schema?: Array<{
    id: string
    code: string | null
    name: string
    data_type: string
    unit: string | null
    help_text?: string | null
    is_required: boolean
    requirement_tier: string
    option_values: string[] | null
    value: string | null
    attribute_value_id: string | null
  }>
  media?: Array<{
    id: string
    media_type: string
    storage_reference: string
    mime_type?: string | null
  }>
  documents?: Array<{
    id: string
    document_type: string
    storage_reference: string
  }>
  variants?: Array<{
    id: string
    variant_type: string
    variant_value: string
    identifiers: Array<{
      id: string
      identifier_type: string
      identifier_value: string
    }>
    offers?: SellerOfferSummary[]
  }>
  field_changes?: Array<{
    id: string
    field_code: string
    field_label: string
    old_value: string | null
    new_value: string | null
    status: string
    seller_id: string
    created_at: string
    reason: string | null
  }>
  versions?: unknown[]
}

export type ProductVariantRow = {
  id: string
  product_id?: string
  variant_type: string
  variant_value: string
  identifiers?: Array<{
    id: string
    identifier_type: string
    identifier_value: string
    country_scope?: string | null
  }>
  offers?: SellerOfferSummary[]
}

export type MadeInEuropeEvidenceItem = {
  id: string
  product_id: string
  document_type: string
  evidence_kind?: string | null
  storage_reference: string
  file_name?: string | null
  mime_type?: string | null
  file_size_bytes?: number | null
  verification_status: string
  verification_notes?: string | null
  created_at?: string
}

export type MadeInEuropeEvidenceResponse = {
  product_id: string
  origin_status: string | null
  score: {
    is_made_in_europe?: boolean
    score?: number
    band_label?: string | null
    [key: string]: unknown
  } | null
  evidence_status: "missing" | "pending_review" | "approved" | "rejected"
  is_made_in_europe_score: boolean
  is_made_in_europe_verified: boolean
  evidence: MadeInEuropeEvidenceItem[]
  facility?: {
    id: string
    name: string
    country_code: string
    is_active?: boolean
    brand_id?: string
  } | null
  status_events?: unknown[]
  note?: string
}

export type EanMatchResponse = {
  outcome: "exact_match" | "uncertain" | "no_match"
  product_id?: string
  product_variant_id?: string
  identifier_id?: string
  match_candidate_ids?: string[]
  confidence_label?: string | null
  confidence_note?: string | null
  product_preview?: ProductCloudPreview
  candidate_previews?: ProductCloudPreview[]
}

export type CreateProductInput = {
  brand_id: string
  manufacturer_id: string
  title: string
  description: string
  category_name: string
  identifier_type: "GTIN" | "MPN"
  identifier_value: string
  create_as_retailer?: boolean
  media?: Array<{
    media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
    storage_reference: string
  }>
}

export type CreateProductResponse = {
  created: boolean
  exact_match_existing?: boolean
  product_id: string
  version_id?: string
  variant_id?: string
  identifier_id?: string
  message?: string
}

export function listOwnProducts(params?: {
  q?: string
  filter?: string
  sort?: string
}) {
  const qs = new URLSearchParams()
  if (params?.q) qs.set("q", params.q)
  if (params?.filter) qs.set("filter", params.filter)
  if (params?.sort) qs.set("sort", params.sort)
  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  return request<{
    products: CatalogProduct[]
    count: number
    total_unfiltered?: number
  }>(`/store/product-cloud/products${suffix}`)
}

export function getProductManager(productId: string) {
  return request<{ product: ProductManagerDetail }>(
    `/store/product-cloud/products/${productId}/manager`
  )
}

export function patchProductInformation(
  productId: string,
  body: {
    title?: string
    description?: string
    manufacturer_id?: string
    brand_id?: string
    brand_is_manufacturer?: boolean
    attributes?: Array<{ attribute_definition_id: string; value: string }>
    reason?: string
  }
) {
  return request<{ product: ProductManagerDetail }>(
    `/store/product-cloud/products/${productId}/information`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )
}

export function matchByEan(identifier_value: string) {
  return request<EanMatchResponse>("/store/product-cloud/ean-match", {
    method: "POST",
    body: JSON.stringify({
      identifier_value,
      identifier_type: "GTIN",
    }),
  })
}

export function createProduct(body: CreateProductInput) {
  return request<CreateProductResponse>("/store/product-cloud/products", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function getProductTranslations(productId: string) {
  return request<{
    product_id: string
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
    targets: Array<{
      language_code: string
      translation_status: string
      ui_status: string
      field_count: number
      has_manual: boolean
    }>
    translations: Array<{
      id: string
      field_name: string
      language_code: string
      value: string
      translation_status: string
      origin?: string
    }>
    provider_configured: boolean
    provider_message: string | null
    active_targets: string[]
  }>(`/store/product-cloud/products/${productId}/translations`)
}

export function setProductSourceLanguage(
  productId: string,
  source_language_code: string
) {
  return request<{
    product_id: string
    source_language_code: string | null
    targets: Array<{
      language_code: string
      translation_status: string
      ui_status: string
    }>
  }>(`/store/product-cloud/products/${productId}/translations`, {
    method: "PATCH",
    body: JSON.stringify({ source_language_code }),
  })
}

export function prepareProductTranslations(productId: string) {
  return request<{
    product_id: string
    enqueue: {
      provider_id: string
      provider_configured: boolean
      results: Array<{
        field_name: string
        language_code: string
        translation_status: string
        error?: string
      }>
    }
    provider_message: string | null
  }>(`/store/product-cloud/products/${productId}/translations`, {
    method: "POST",
    body: JSON.stringify({ only_missing: true }),
  })
}

export function addProductMediaByUrl(
  productId: string,
  body: {
    storage_reference: string
    media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
    version_id?: string
  }
) {
  return request<{ media: { id: string; media_type: string; storage_reference: string } }>(
    `/store/product-cloud/products/${productId}/media`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

export async function uploadProductMediaFile(
  productId: string,
  file: File,
  opts?: { media_type?: string; version_id?: string }
) {
  const form = new FormData()
  form.append("file", file)
  if (opts?.media_type) form.append("media_type", opts.media_type)
  if (opts?.version_id) form.append("version_id", opts.version_id)

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

  const response = await fetch(
    `${BACKEND_URL}/store/product-cloud/products/${productId}/media/upload`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
      body: form,
    }
  )
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Upload mislukt."
    throw new ProductCloudApiError(message, response.status)
  }
  return body as {
    media: { id: string; media_type: string; storage_reference: string }
    limits: { max_bytes: number; mime_types: string[]; recommended: string }
  }
}

export function deleteProductMedia(productId: string, mediaId: string) {
  return request<{ deleted: boolean; media_id: string }>(
    `/store/product-cloud/products/${productId}/media/${mediaId}`,
    { method: "DELETE" }
  )
}

export function setProductMediaPrimary(productId: string, mediaId: string) {
  return request<{ media: { id: string; media_type: string } }>(
    `/store/product-cloud/products/${productId}/media/${mediaId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ set_primary: true }),
    }
  )
}

export function reorderProductMedia(productId: string, mediaIds: string[]) {
  return request<{ media: Array<{ id: string; sort_order?: number }> }>(
    `/store/product-cloud/products/${productId}/media/reorder`,
    {
      method: "POST",
      body: JSON.stringify({ media_ids: mediaIds }),
    }
  )
}

export function uploadComplianceEvidence(
  productId: string,
  body: {
    storage_reference: string
    evidence_kind?: "made_in_europe" | "ce_marking" | "data_usage"
    evidence_kinds?: Array<"made_in_europe" | "ce_marking" | "data_usage">
    document_type?: "photo" | "pdf" | "other"
    file_name?: string
    mime_type?: string
    file_size_bytes?: number
  }
) {
  return request(`/store/product-cloud/products/${productId}/made-in-europe/evidence`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function bulkUpdateProductInformation(body: {
  product_ids: string[]
  attributes: Array<{ code: string; value: string }>
  confirm: true
  reason?: string
}) {
  return request<{
    results: Array<{
      product_id: string
      ok: boolean
      updated: number
      error?: string
    }>
    supported_codes: string[]
    note: string
  }>("/store/product-cloud/products/bulk-information", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function assignProductMadeInEurope(
  productId: string,
  body: {
    production_facility_id?: string | null
    assembly_eu_band?: string
    parts_eu_level?: string
    materials_eu_level?: string
    primary_assembly_country?: string | null
  }
) {
  return request<{
    product_id: string
    facility: { id: string; name: string; country_code: string } | null
  }>(`/store/product-cloud/products/${productId}/made-in-europe`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function bulkLinkBrandLocation(body: {
  product_ids: string[]
  brand_id: string
  production_facility_id: string
}) {
  return request<{
    message: string
    results: Array<{ product_id: string; ok: boolean; error?: string }>
  }>("/store/product-cloud/products/bulk-brand-location", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function listProductVariants(productId: string) {
  return request<{
    product_id: string
    variants: ProductVariantRow[]
    suggested_axes: string[]
    allowed_variant_types: string[]
    note?: string
  }>(`/store/product-cloud/products/${productId}/variants`)
}

export function createProductVariant(
  productId: string,
  body: {
    variant_type?: string
    variant_value?: string
    axes?: Array<{ axis: string; value: string }>
    identifier_type?: "GTIN" | "MPN"
    identifier_value: string
    country_scope?: string | null
    duplicate_from_variant_id?: string
  }
) {
  return request<{
    variant: ProductVariantRow
    identifier: {
      id: string
      identifier_type: string
      identifier_value: string
    }
  }>(`/store/product-cloud/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function updateProductVariant(
  productId: string,
  variantId: string,
  body: {
    variant_type?: string
    variant_value?: string
    axes?: Array<{ axis: string; value: string }>
    identifier_value?: string
    identifier_type?: "GTIN" | "MPN"
  }
) {
  return request<{
    variant: ProductVariantRow
    identifiers: Array<{
      id: string
      identifier_type: string
      identifier_value: string
    }>
  }>(`/store/product-cloud/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function deleteProductVariant(
  productId: string,
  variantId: string,
  opts?: { withdraw_offers?: boolean }
) {
  const qs = opts?.withdraw_offers ? "?withdraw_offers=true" : ""
  return request<{
    ok: boolean
    variant_id: string
    offers_withdrawn?: boolean
  }>(`/store/product-cloud/products/${productId}/variants/${variantId}${qs}`, {
    method: "DELETE",
  })
}

export function getMadeInEuropeEvidence(productId: string) {
  return request<MadeInEuropeEvidenceResponse>(
    `/store/product-cloud/products/${productId}/made-in-europe/evidence`
  )
}

export function addMadeInEuropeEvidence(
  productId: string,
  body: {
    storage_reference: string
    document_type?: "photo" | "pdf" | "other"
    file_name?: string
    mime_type?: string
    file_size_bytes?: number
  }
) {
  return request<{
    evidence: MadeInEuropeEvidenceItem
    origin_status: string
  }>(`/store/product-cloud/products/${productId}/made-in-europe/evidence`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function deleteMadeInEuropeEvidence(
  productId: string,
  evidenceId: string
) {
  return request<{ ok: boolean; evidence_id: string }>(
    `/store/product-cloud/products/${productId}/made-in-europe/evidence/${evidenceId}`,
    { method: "DELETE" }
  )
}

export function publishProductVersion(productId: string, versionId: string) {
  return request<{
    version: { id: string; publication_status: string }
    lifecycle_status: string
  }>(
    `/store/product-cloud/products/${productId}/versions/${versionId}/publish`,
    { method: "POST" }
  )
}

export function submitProductForApproval(productId: string, versionId: string) {
  return request<{
    version: { id: string; publication_status: string }
    approval_status: string
  }>(
    `/store/product-cloud/products/${productId}/versions/${versionId}/submit`,
    { method: "POST" }
  )
}

export type ImportPreviewResponse = {
  headers: string[]
  mapping: Record<string, string | null>
  suggested_mapping: Record<string, string | null>
  canonical_columns: string[]
  category_columns?: string[]
  category_fields?: Array<{
    code: string
    name: string
    requirement_tier?: string
    unit?: string | null
  }>
  detected_categories?: string[]
  preview: Array<{
    row: number
    values: Record<string, string>
    status: "new" | "existing" | "error"
    issues: Array<{ row: number; field: string; message: string }>
  }>
  summary: {
    rows: number
    new_products: number
    existing_products: number
    error_rows: number
    missing_ean: number
    missing_required: number
  }
  csv_limitation?: string
}

export function previewProductImport(body: {
  csv_text?: string
  headers?: string[]
  rows?: string[][]
  mapping?: Record<string, string | null>
}) {
  return request<ImportPreviewResponse>("/store/product-cloud/import/preview", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function commitProductImport(body: {
  csv_text?: string
  headers?: string[]
  rows?: string[][]
  mapping?: Record<string, string | null>
}) {
  return request<{ imported: number; updated: number; product_ids: string[] }>(
    "/store/product-cloud/import",
    { method: "POST", body: JSON.stringify(body) }
  )
}

export async function previewProductImportFile(
  file: File,
  mapping?: Record<string, string | null>
) {
  const form = new FormData()
  form.append("file", file)
  if (mapping) form.append("mapping", JSON.stringify(mapping))
  const response = await fetch(
    `${BACKEND_URL}/store/product-cloud/import/preview`,
    {
      method: "POST",
      credentials: "include",
      headers: PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {},
      body: form,
    }
  )
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : "Preview mislukt."
    throw new ProductCloudApiError(message, response.status)
  }
  return body as ImportPreviewResponse
}

export async function commitProductImportFile(
  file: File,
  mapping: Record<string, string | null>
) {
  const form = new FormData()
  form.append("file", file)
  form.append("mapping", JSON.stringify(mapping))
  const response = await fetch(`${BACKEND_URL}/store/product-cloud/import`, {
    method: "POST",
    credentials: "include",
    headers: PUBLISHABLE_KEY
      ? { "x-publishable-api-key": PUBLISHABLE_KEY }
      : {},
    body: form,
  })
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : "Import mislukt."
    throw new ProductCloudApiError(message, response.status)
  }
  return body as { imported: number; updated: number; product_ids: string[] }
}

export function productImportTemplateUrl(format: "xlsx" | "csv") {
  return `${BACKEND_URL}/store/product-cloud/import/template?format=${format}`
}

export async function downloadProductImportTemplate(format: "xlsx" | "csv") {
  const response = await fetch(productImportTemplateUrl(format), {
    credentials: "include",
    headers: PUBLISHABLE_KEY
      ? { "x-publishable-api-key": PUBLISHABLE_KEY }
      : {},
  })
  if (!response.ok) {
    throw new ProductCloudApiError("Template downloaden mislukt.", response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download =
    format === "csv"
      ? "EuropMade product import.csv"
      : "EuropMade product template.xlsx"
  a.click()
  URL.revokeObjectURL(url)
}
