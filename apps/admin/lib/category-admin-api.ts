import { adminFetch } from "./admin-fetch"

export class CategoryAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "CategoryAdminApiError"
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
    throw new CategoryAdminApiError(message, response.status)
  }
  return body as T
}

export type AdminTaxonomyCategory = {
  id: string
  name: string
  slug: string | null
  parent_category_id: string | null
}

export type CategoryTranslationRow = {
  id: string
  field_name: string
  language_code: string
  value: string
  translation_status: string
}

export type CategoryRedirectRow = {
  id: string
  from_slug: string
  to_slug: string
}

export type CategoryProposalRow = {
  id: string
  name: string
  suggested_slug: string
  seller_id: string | null
  status: string
}

export function listTaxonomyCategories() {
  return request<{ categories: AdminTaxonomyCategory[] }>(
    "/admin/product-cloud/categories"
  )
}

export function createTaxonomyCategory(body: {
  name: string
  slug?: string
  parent_category_id?: string | null
  seed_attributes?: boolean
}) {
  return request<{
    category: AdminTaxonomyCategory & { id: string; name: string }
  }>("/admin/product-cloud/categories", {
    method: "POST",
    body: JSON.stringify({ ...body, seed_attributes: body.seed_attributes ?? false }),
  })
}

export function getTaxonomyCategory(id: string) {
  return request<{
    category: AdminTaxonomyCategory
    translations: CategoryTranslationRow[]
    redirects: CategoryRedirectRow[]
  }>(`/admin/product-cloud/categories/${id}`)
}

export function patchTaxonomyCategory(
  id: string,
  body: {
    name?: string
    slug?: string | null
    parent_category_id?: string | null
  }
) {
  return request<{ category: AdminTaxonomyCategory }>(
    `/admin/product-cloud/categories/${id}`,
    { method: "PATCH", body: JSON.stringify(body) }
  )
}

export function addCategoryRedirect(id: string, from_slug: string, to_slug?: string) {
  return request<{ redirect: CategoryRedirectRow }>(
    `/admin/product-cloud/categories/${id}/redirects`,
    { method: "POST", body: JSON.stringify({ from_slug, to_slug }) }
  )
}

export function listCategoryProposals() {
  return request<{ proposals: CategoryProposalRow[] }>(
    "/admin/product-cloud/category-proposals"
  )
}

export function decideCategoryProposal(
  id: string,
  decision: "accept" | "reject",
  parent_category_id?: string | null
) {
  return request<{ decision: string; category?: AdminTaxonomyCategory }>(
    `/admin/product-cloud/category-proposals/${id}`,
    {
      method: "POST",
      body: JSON.stringify({ decision, parent_category_id }),
    }
  )
}
