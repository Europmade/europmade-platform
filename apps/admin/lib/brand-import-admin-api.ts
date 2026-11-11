import { adminFetch } from "./admin-fetch"
import { ProductApprovalAdminApiError } from "./product-approval-admin-api"

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Er is iets misgegaan."
    throw new ProductApprovalAdminApiError(message, response.status, body)
  }
  return body as T
}

export type BrandColumnLink = {
  id: string
  field: string | null
  label: string
  source: string
  sample: string
  confidence: "certain" | "review" | "unmapped" | "commercial"
  language_code: string | null
  imported: boolean
  message: string | null
}

export type BrandPreviewPayload = {
  preview: {
    mode: "brand"
    links: BrandColumnLink[]
    commercial_columns: string[]
    conflicts: string[]
    language: {
      suggested: string | null
      needs_confirmation: boolean
      confirmed: boolean
      reason: string
    }
    profile_applied: boolean
    profile_review_required: boolean
    profile_reason: string | null
    commit_allowed: boolean
    creates_offers: false
    target_fields?: Array<{ field: string; label: string; group: string }>
    category_fields?: Array<{
      code: string
      name: string
      requirement_tier?: string
      unit?: string | null
      option_values?: string[] | null
      data_type?: string | null
    }>
    detected_categories?: string[]
    brand_proposals?: Array<{
      name: string
      status: "create" | "ambiguous"
      candidates: Array<{ id: string; name: string }>
    }>
    category_proposals?: Array<{
      kind: "category" | "subcategory"
      raw: string
      status: "create" | "confirm" | "needs_parent"
      parent_name: string | null
      candidates: Array<{ id: string; name: string }>
      message: string
    }>
    summary: {
      rows: number
      new_products: number
      existing_products: number
      error_rows: number
      duplicates: number
    }
    preview: Array<{
      row: number
      status: "new" | "existing" | "error"
      title: string
      ean: string
      texts: Array<{ field: string; language_code: string; value: string }>
      issues: Array<{ row: number; field: string; message: string; blocking: boolean }>
      match: { product_id: string; publication_status: string | null } | null
    }>
  }
  plan_blocked: boolean
  plan_reason: string | null
}

export type OfferListRow = {
  id: string
  product_id: string | null
  title: string | null
  identifier_value: string | null
  seller_id: string
  seller_name: string
  region_code: string
  seller_sku: string | null
  sales_status: string
  delivery_days_max: number | null
  shipping_profile_id: string | null
  base_price: unknown
  promo_price: unknown
  shipping_cost: unknown
  quantity_available: number | null
  primary_image_url?: string | null
}

function formBody(input: {
  file?: File | null
  csv_text?: string
  source_key: string
  source_language_code?: string
  language_confirmed?: boolean
  mapping_confirmed?: boolean
  enqueue_translations?: boolean
  mapping?: Record<string, string | null>
  column_languages?: Record<string, string | null>
  manual_links?: BrandColumnLink[]
  brand_choices?: Record<string, { action: "use"; id: string } | { action: "create"; name: string }>
  category_decisions?: Array<{
    kind: "category" | "subcategory"
    raw: string
    action: "create" | "link" | "skip"
    name?: string
    parent_name?: string
    id?: string
  }>
  attribute_overrides?: Record<string, Record<string, string>>
}) {
  const body = new FormData()
  if (input.file) body.set("file", input.file)
  if (input.csv_text) body.set("csv_text", input.csv_text)
  body.set("source_key", input.source_key)
  if (input.source_language_code) body.set("source_language_code", input.source_language_code)
  body.set("language_confirmed", input.language_confirmed ? "true" : "false")
  body.set("mapping_confirmed", input.mapping_confirmed ? "true" : "false")
  body.set("enqueue_translations", input.enqueue_translations ? "true" : "false")
  if (input.mapping) body.set("mapping", JSON.stringify(input.mapping))
  if (input.column_languages) body.set("column_languages", JSON.stringify(input.column_languages))
  if (input.manual_links) body.set("manual_links", JSON.stringify(input.manual_links))
  if (input.brand_choices) body.set("brand_choices", JSON.stringify(input.brand_choices))
  if (input.category_decisions) body.set("category_decisions", JSON.stringify(input.category_decisions))
  if (input.attribute_overrides) {
    body.set("attribute_overrides", JSON.stringify(input.attribute_overrides))
  }
  return body
}

export async function downloadBrandWorkbook() {
  const response = await adminFetch("/admin/product-cloud/brand-import/template")
  if (!response.ok) {
    throw new ProductApprovalAdminApiError("Download mislukt.", response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "EuropMade Admin product template.xlsx"
  anchor.click()
  URL.revokeObjectURL(url)
}

export function previewBrandImport(input: Parameters<typeof formBody>[0]) {
  return request<BrandPreviewPayload>("/admin/product-cloud/brand-import/preview", {
    method: "POST",
    body: formBody(input),
  })
}

export function commitBrandImport(input: Parameters<typeof formBody>[0]) {
  return request<{
    batch_id: string
    created: string[]
    proposals: string[]
    translations_added: string[]
    offers_created: number
  }>("/admin/product-cloud/brand-import", { method: "POST", body: formBody(input) })
}

export function listBrandImportBatches() {
  return request<{
    batches: Array<{
      id: string
      source_key: string
      file_name: string | null
      status: string
      source_language_code: string | null
      summary: { rows?: number; error_rows?: number; new_products?: number; existing_products?: number } | null
      created_at?: string
    }>
    count: number
  }>("/admin/product-cloud/brand-import/batches")
}

export type AdminOfferDetail = OfferListRow & {
  extra_delivery_cost: unknown
  shipping_profile: {
    id: string
    name: string
    description: string | null
    status: string
    country_rates: unknown
    processing_settings: unknown
    carrier_mode: string
  } | null
  shipping_profiles: Array<{ id: string; name: string; status: string }>
  price_id: string | null
  inventory_id: string | null
}

export type AdminOfferPatch = {
  base_price?: number | null
  promo_price?: number | null
  shipping_cost?: number | null
  quantity_available?: number | null
  seller_sku?: string | null
  delivery_days_max?: number | null
  sales_status?: "active" | "paused"
  shipping_profile_id?: string | null
}

export function getAdminOffer(id: string) {
  return request<{ offer: AdminOfferDetail }>(`/admin/product-cloud/offers/${id}`)
}

export function updateAdminOffer(id: string, patch: AdminOfferPatch) {
  return request<{ offer: AdminOfferDetail }>(`/admin/product-cloud/offers/${id}`, {
    method: "POST",
    body: JSON.stringify(patch),
  })
}

export function listAdminOffers(
  params: { q?: string; seller_id?: string; region_code?: string; product_id?: string } = {}
) {
  const sp = new URLSearchParams()
  if (params.q) sp.set("q", params.q)
  if (params.seller_id) sp.set("seller_id", params.seller_id)
  if (params.region_code) sp.set("region_code", params.region_code)
  if (params.product_id) sp.set("product_id", params.product_id)
  const qs = sp.toString()
  return request<{ offers: OfferListRow[]; count: number }>(
    `/admin/product-cloud/offers${qs ? `?${qs}` : ""}`
  )
}
