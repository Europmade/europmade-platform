import { adminFetch } from "./admin-fetch"

export class ProductFieldsAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ProductFieldsAdminApiError"
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
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Er is iets misgegaan."
    throw new ProductFieldsAdminApiError(message, response.status)
  }
  return body as T
}

export type AdminCategory = {
  id: string
  name: string
  slug?: string | null
}

export type AdminAttribute = {
  id: string
  name: string
  code: string | null
  data_type: string
  requirement_tier?: string
  unit?: string | null
  help_text?: string | null
  sort_order?: number
  is_active?: boolean
  option_values?: string | null
}

export function listAdminCategories() {
  return request<{ categories: AdminCategory[] }>(
    "/admin/product-cloud/categories"
  )
}

export function listCategoryAttributes(categoryId: string) {
  return request<{
    category: AdminCategory
    attribute_definitions: AdminAttribute[]
  }>(`/admin/product-cloud/categories/${categoryId}/attributes`)
}

export function createCategoryAttribute(
  categoryId: string,
  body: Record<string, unknown>
) {
  return request<{ attribute_definition: AdminAttribute }>(
    `/admin/product-cloud/categories/${categoryId}/attributes`,
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function patchCategoryAttribute(
  categoryId: string,
  attrId: string,
  body: Record<string, unknown>
) {
  return request<{ attribute_definition: AdminAttribute }>(
    `/admin/product-cloud/categories/${categoryId}/attributes/${attrId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  )
}

export function suggestCategoryAttributes(categoryId: string) {
  return request<{
    provider: string
    available: boolean
    message: string
    suggestions: unknown[]
  }>(`/admin/product-cloud/categories/${categoryId}/attribute-suggestions`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}
