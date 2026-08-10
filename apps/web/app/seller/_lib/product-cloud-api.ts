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

export type CatalogProduct = {
  id: string
  brand_id: string
  manufacturer_id: string
  lifecycle_status: string
  current_owner_seller_id: string
  title: string | null
  category_names: string[]
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
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

export function listOwnProducts() {
  return request<{ products: CatalogProduct[]; count: number }>(
    "/store/product-cloud/products"
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
