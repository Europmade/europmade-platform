/**
 * Admin CMS API client — Medusa /admin/cms/*
 */

import { adminFetch } from "./admin-fetch"
import { medusaBackendUrl } from "./medusa-backend-url"
import {
  normalizeMediaMimeType,
  readImageDimensions,
  type CategoryPreviewConceptProduct,
} from "@europmade/utils"

export class CmsAdminApiError extends Error {
  status?: number
  type?: string
  details?: unknown
  constructor(
    message: string,
    status?: number,
    type?: string,
    details?: unknown
  ) {
    super(message)
    this.name = "CmsAdminApiError"
    this.status = status
    this.type = type
    this.details = details
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const obj =
      body && typeof body === "object" ? (body as Record<string, unknown>) : null
    const message =
      obj && typeof obj.message === "string"
        ? obj.message
        : "Er is iets misgegaan. Probeer het opnieuw."
    const type = obj && typeof obj.type === "string" ? obj.type : undefined
    throw new CmsAdminApiError(message, response.status, type, obj?.details)
  }
  return body as T
}

export type LocalizedCms = {
  nl: string
  en: string
  de: string
  fr: string
}

export type CmsBannerDto = {
  id: string
  position: number
  location: string
  title: LocalizedCms
  subtitle: LocalizedCms
  cta_label: LocalizedCms
  destination_url: string
  link_type: string
  image_url: string | null
  image_alt: LocalizedCms
  background: string | null
  presentation?: {
    fit?: "cover" | "contain"
    positionX?: number
    positionY?: number
    scale?: number
    textColor?: "white" | "black"
    buttonColor?: "white" | "black"
  } | null
  logo_url: string | null
  market_scope: "all" | "selected"
  markets: string[]
  visible: boolean
  sort_order: number
  publish_at: string | null
  expires_at: string | null
  published: boolean
  asset_id: string | null
  i18n_meta?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export type CmsPageDto = {
  id: string
  slug: string
  title: LocalizedCms
  body: LocalizedCms
  seo_title: LocalizedCms | null
  seo_description: LocalizedCms | null
  seo_canonical: string | null
  published: boolean
  visible: boolean
  sort_order: number
  publish_at?: string | null
  expires_at?: string | null
  cover_url?: string | null
  document?: unknown
  i18n_meta?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export type CmsHomepageDto = {
  id: string
  document_key: string
  document: unknown
  seo_title: LocalizedCms | null
  seo_description: LocalizedCms | null
  seo_canonical: string | null
  og_title: LocalizedCms | null
  og_description: LocalizedCms | null
  published: boolean
  created_at?: string
  updated_at?: string
}

export type CmsCategoryDto = {
  id: string | null
  category_slug: string
  document: unknown
  published: boolean
  published_version?: number
  draft_sync_state?: string
  i18n_meta?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

/** Admin Published/Draft payload for a category editorial page. */
export type CmsCategoryPdDto = {
  id: string | null
  category_slug: string
  i18n_meta?: Record<string, unknown> | null
  published: {
    document: unknown
    version: number
    at: string | null
    by: string | null
    note: string | null
  } | null
  draft: {
    document: unknown
    base_version: number | null
    revision: number
    sync_state: "absent" | "in_sync" | "unpublished_changes" | string
    updated_at: string | null
    updated_by: string | null
    restored_from_version?: number | null
  } | null
  stale_base: boolean
  profile?: "level_1" | "level_2" | "level_3" | null
  profile_error?: string | null
  created_at?: string
  updated_at?: string
}

export type CmsProductDto = {
  id: string | null
  product_id: string
  document: unknown
  published: boolean
  i18n_meta?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export function emptyLocalized(): LocalizedCms {
  return { nl: "", en: "", de: "", fr: "" }
}

export function listCmsBanners() {
  return request<{ banners: CmsBannerDto[]; markets: string[] }>(
    "/admin/cms/banners"
  )
}

export function getCmsBanner(id: string) {
  return request<{ banner: CmsBannerDto }>(`/admin/cms/banners/${id}`)
}

export function createCmsBanner(body: Partial<CmsBannerDto>) {
  return request<{ banner: CmsBannerDto }>("/admin/cms/banners", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function updateCmsBanner(id: string, body: Partial<CmsBannerDto>) {
  return request<{ banner: CmsBannerDto }>(`/admin/cms/banners/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function deleteCmsBanner(id: string) {
  return request<{ id: string; deleted: boolean }>(`/admin/cms/banners/${id}`, {
    method: "DELETE",
  })
}

export function getCmsTheme() {
  return request<{ theme: CmsHomepageDto | null }>("/admin/cms/theme")
}

export function putCmsTheme(body: Record<string, unknown>) {
  return request<{ theme: CmsHomepageDto }>("/admin/cms/theme", {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function getCmsHomepage() {
  return request<{
    homepage: CmsHomepageDto | null
    has_draft?: boolean
    markets: string[]
  }>("/admin/cms/homepage")
}

export function putCmsHomepage(body: Record<string, unknown>) {
  return request<{ homepage: CmsHomepageDto; has_draft?: boolean }>(
    "/admin/cms/homepage",
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  )
}

export function listCmsPages() {
  return request<{ pages: CmsPageDto[] }>("/admin/cms/pages")
}

export function getCmsPage(id: string) {
  return request<{ page: CmsPageDto }>(`/admin/cms/pages/${id}`)
}

export function listCmsEditorialCategories() {
  return request<{ categories: CmsCategoryDto[] }>("/admin/cms/categories")
}

export function getCmsEditorialCategory(slug: string) {
  return request<{ category: CmsCategoryPdDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}`
  )
}

/** @deprecated Prefer create/save/publish draft endpoints. */
export function putCmsEditorialCategory(
  slug: string,
  body: { document: unknown; published: boolean; i18n_meta?: unknown }
) {
  return request<{ category: CmsCategoryDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}`,
    { method: "PUT", body: JSON.stringify(body) }
  )
}

export function createCmsCategoryDraft(
  slug: string,
  body: { from?: "published" | "empty"; overwrite?: boolean } = {}
) {
  return request<{ category: CmsCategoryPdDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/draft`,
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function saveCmsCategoryDraft(
  slug: string,
  body: { document: unknown; expected_draft_revision: number; i18n_meta?: unknown }
) {
  return request<{ category: CmsCategoryPdDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/draft`,
    { method: "PATCH", body: JSON.stringify(body) }
  )
}

export function deleteCmsCategoryDraft(slug: string) {
  return request<{ category: CmsCategoryPdDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/draft`,
    { method: "DELETE" }
  )
}

export type CmsCategoryProposalDto = {
  id: string
  slug: string
  profile: "level_1" | "level_2" | "level_3"
  block_id: string
  block_type: string
  fact_fingerprint: string
  status: "proposed" | "accepted" | "modified" | "rejected" | "outdated"
  confidence: "blocked" | "partial" | "factual"
  generation_reason: string
  used_facts: Array<{ path: string }>
  missing: Array<{ code: string; count?: number }>
  missing_locales: Array<"nl" | "en" | "de" | "fr">
  content: Record<string, Record<string, string>> | null
  provider_id: string
  prompt_version: string
  applied_draft_revision: number | null
}

export type CmsCategoryProposalCostDto = {
  proposal_id: string
  locale: "nl" | "en" | "de" | "fr"
  provider_id: string
  input_tokens: number
  output_tokens: number
  currency: string
  amount_minor: number
}

export function listCmsCategoryProposals(slug: string) {
  return request<{ proposals: CmsCategoryProposalDto[]; costs: CmsCategoryProposalCostDto[] }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/proposals`
  )
}

export function generateCmsCategoryProposals(slug: string) {
  return request<{ proposals: CmsCategoryProposalDto[]; costs: CmsCategoryProposalCostDto[]; provider_calls: number }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/proposals/generate`,
    { method: "POST", body: JSON.stringify({ explicit: true }) }
  )
}

export function modifyCmsCategoryProposal(
  slug: string,
  id: string,
  content: CmsCategoryProposalDto["content"]
) {
  return request<{ proposal: CmsCategoryProposalDto; published: false }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/proposals/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ content }) }
  )
}

export function acceptCmsCategoryProposal(slug: string, id: string, expectedDraftRevision: number) {
  return request<{ category?: CmsCategoryPdDto; applied?: boolean; published?: false }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/proposals/${encodeURIComponent(id)}/accept`,
    { method: "POST", body: JSON.stringify({ expected_draft_revision: expectedDraftRevision }) }
  )
}

export function rejectCmsCategoryProposal(slug: string, id: string) {
  return request<{ proposal: CmsCategoryProposalDto; draft_changed: false; published: false }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/proposals/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: JSON.stringify({}) }
  )
}

export function publishCmsCategoryDraft(
  slug: string,
  body: {
    confirm: boolean
    expected_draft_revision: number
    note?: string | null
  }
) {
  return request<{ category: CmsCategoryPdDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/publish`,
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function rebaseCmsCategoryDraft(
  slug: string,
  body: {
    mode: "keep_draft_content" | "replace_with_live"
    expected_draft_revision: number
    acknowledge_unmerged_live?: boolean
    confirm_destroy_draft_changes?: boolean
  }
) {
  return request<{ category: CmsCategoryPdDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}/draft/rebase`,
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function listCmsEditorialProducts() {
  return request<{ products: CmsProductDto[] }>("/admin/cms/products")
}

export function getCmsEditorialProduct(productId: string) {
  return request<{ product: CmsProductDto }>(
    `/admin/cms/products/${encodeURIComponent(productId)}`
  )
}

export function putCmsEditorialProduct(
  productId: string,
  body: { document: unknown; published: boolean; i18n_meta?: unknown }
) {
  return request<{ product: CmsProductDto }>(
    `/admin/cms/products/${encodeURIComponent(productId)}`,
    { method: "PUT", body: JSON.stringify(body) }
  )
}

export async function fetchPublicCatalogProducts(opts?: {
  category?: string
  q?: string
  limit?: number
}) {
  const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
  const qs = new URLSearchParams()
  if (opts?.category) qs.set("category", opts.category)
  if (opts?.q) qs.set("q", opts.q)
  qs.set("limit", String(opts?.limit ?? 8))
  qs.set("region_code", "NL")
  const res = await fetch(`${medusaBackendUrl()}/store/catalog/products?${qs}`, {
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "x-publishable-api-key": key } : {}),
    },
  })
  if (!res.ok) return { products: [] as Array<Record<string, unknown>> }
  return (await res.json()) as { products: Array<Record<string, unknown>> }
}

/**
 * Product-/attribuutfeiten voor USP/FAQ-voorstellen.
 * Gebruikt Admin-API's (session/Bearer) i.p.v. Store-API's — Store CORS
 * staat Admin (poort 3001) niet toe, wat in de browser "Failed to fetch" gaf.
 */
export async function fetchCategoryCopyFacts(slug: string): Promise<{
  products: Array<Record<string, unknown>>
  attributes: Array<{ code: string; name: string }>
}> {
  const normalized = slug.trim().toLowerCase()
  const [catRes, prodRes] = await Promise.all([
    request<{
      categories: Array<{ id: string; name: string; slug?: string | null }>
    }>("/admin/product-cloud/categories"),
    request<{
      products: Array<{
        brand_name?: string | null
        category_names?: string[]
      }>
    }>(
      `/admin/product-cloud/products?limit=100&publication_status=${encodeURIComponent("Gepubliceerd")}`
    ),
  ])

  const category =
    catRes.categories.find(
      (c) => (c.slug ?? "").trim().toLowerCase() === normalized
    ) ??
    catRes.categories.find(
      (c) => c.name.trim().toLowerCase().replace(/\s+/g, "-") === normalized
    ) ??
    catRes.categories.find((c) => c.name.trim().toLowerCase() === normalized)

  let attributes: Array<{ code: string; name: string }> = []
  if (category) {
    const attrRes = await request<{
      attribute_definitions: Array<{
        code: string | null
        name: string
        is_active?: boolean
      }>
    }>(`/admin/product-cloud/categories/${category.id}/attributes`)
    attributes = (attrRes.attribute_definitions ?? [])
      .filter((a) => a.is_active !== false && (a.code || a.name))
      .map((a) => ({
        code: a.code || a.name,
        name: a.name || a.code || "",
      }))
  }

  const catName = (category?.name ?? "").trim().toLowerCase()
  const products = (prodRes.products ?? []).filter((p) => {
    const names = p.category_names ?? []
    if (catName && names.some((n) => n.trim().toLowerCase() === catName)) {
      return true
    }
    return names.some(
      (n) => n.trim().toLowerCase().replace(/\s+/g, "-") === normalized
    )
  }) as Array<Record<string, unknown>>

  return { products, attributes }
}

export type CategoryListingProduct = {
  id: string
  title: string
  brand_name: string | null
  image_url: string | null
  from_price: number | null
  attributes: Array<{ code: string; value: string }>
}

export type CategoryProductRelationRow = {
  from_product_id: string
  to_product_id: string
  relation_type: string
}

export async function fetchCategoryProductRelations(slug: string): Promise<{
  source_count: number
  relations: CategoryProductRelationRow[]
}> {
  const res = await request<{
    source_count?: number
    relations?: CategoryProductRelationRow[]
  }>(`/admin/cms/categories/${encodeURIComponent(slug.trim().toLowerCase())}/product-relations`)
  return {
    source_count: res.source_count ?? 0,
    relations: (res.relations ?? []).flatMap((relation) => {
      const fromId = relation.from_product_id?.trim() ?? ""
      const toId = relation.to_product_id?.trim() ?? ""
      const type = relation.relation_type?.trim() ?? ""
      if (!fromId || !toId || !type) return []
      return [{ from_product_id: fromId, to_product_id: toId, relation_type: type }]
    }),
  }
}

export type CategorySpecDefinition = {
  code: string
  name: string
  dataType: string
  unit: string | null
  optionValues: string | null
}

export async function fetchCategorySpecDefinitions(slug: string): Promise<CategorySpecDefinition[]> {
  const normalized = slug.trim().toLowerCase()
  const catRes = await request<{
    categories: Array<{ id: string; name: string; slug?: string | null }>
  }>("/admin/product-cloud/categories")
  const category =
    catRes.categories.find((row) => (row.slug ?? "").trim().toLowerCase() === normalized) ??
    catRes.categories.find((row) => row.name.trim().toLowerCase().replace(/\s+/g, "-") === normalized)
  if (!category) return []
  const attrRes = await request<{
    attribute_definitions: Array<{
      code?: string | null
      name?: string
      data_type?: string | null
      unit?: string | null
      option_values?: string | null
      is_active?: boolean
    }>
  }>(`/admin/product-cloud/categories/${category.id}/attributes`)
  return (attrRes.attribute_definitions ?? []).flatMap((attribute) => {
    if (attribute.is_active === false) return []
    const code = attribute.code?.trim() || ""
    const name = attribute.name?.trim() || ""
    if (!code || !name) return []
    return [
      {
        code,
        name,
        dataType: attribute.data_type?.trim() || "",
        unit: attribute.unit?.trim() || null,
        optionValues: attribute.option_values ?? null,
      },
    ]
  })
}

export async function fetchCategoryListingProducts(
  slug: string
): Promise<CategoryListingProduct[]> {
  const res = await request<{ products?: CategoryListingProduct[] }>(
    `/admin/cms/categories/${encodeURIComponent(slug.trim().toLowerCase())}/listing-products`
  )
  return (res.products ?? []).flatMap((product) => {
    const id = product.id?.trim()
    const title = product.title?.trim()
    if (!id || !title) return []
    return [
      {
        id,
        title,
        brand_name: product.brand_name?.trim() || null,
        image_url: product.image_url,
        from_price:
          product.from_price != null && product.from_price > 0 ? product.from_price : null,
        attributes: (product.attributes ?? []).flatMap((attribute) => {
          const code = attribute.code?.trim() || ""
          const value = attribute.value?.trim() || ""
          if (!code || !value) return []
          return [{ code, value }]
        }),
      },
    ]
  })
}

export async function fetchCategoryPreviewProducts(
  slug: string
): Promise<CategoryPreviewConceptProduct[]> {
  const res = await request<{ products?: CategoryPreviewConceptProduct[] }>(
    `/admin/cms/categories/${encodeURIComponent(slug.trim().toLowerCase())}/preview-products`
  )
  return (res.products ?? []).flatMap((product) => {
    const id = product.id?.trim()
    const title = product.title?.trim()
    if (!id || !title || product.publication_status !== "Concept") return []
    return [
      {
        id,
        title,
        brand_name: product.brand_name?.trim() || null,
        image_url: product.image_url,
        image_urls: (product.image_urls ?? []).flatMap((url) => {
          const trimmed = url.trim()
          return trimmed ? [trimmed] : []
        }),
        category_slugs: (product.category_slugs ?? []).flatMap((item) => {
          const trimmed = item.trim().toLowerCase()
          return trimmed ? [trimmed] : []
        }),
        from_price:
          product.from_price != null && product.from_price > 0 ? product.from_price : null,
        attributes: (product.attributes ?? []).flatMap((attribute) => {
          const code = attribute.code?.trim() || ""
          const value = attribute.value?.trim() || ""
          if (!code || !value) return []
          return [{ code, value }]
        }),
        publication_status: "Concept" as const,
      },
    ]
  })
}

const COMPARABLE_DATA_TYPES = new Set(["Numeriek", "Keuzelijst", "Tekst-met-eenheid"])

export type ComparableCategoryAttribute = {
  code: string
  name: string
  dataType: string
  unit: string | null
}

export async function fetchComparableCategoryAttributes(
  slug: string
): Promise<ComparableCategoryAttribute[]> {
  const normalized = slug.trim().toLowerCase()
  const catRes = await request<{
    categories: Array<{ id: string; name: string; slug?: string | null }>
  }>("/admin/product-cloud/categories")
  const category =
    catRes.categories.find((row) => (row.slug ?? "").trim().toLowerCase() === normalized) ??
    catRes.categories.find((row) => row.name.trim().toLowerCase().replace(/\s+/g, "-") === normalized)
  if (!category) return []
  const attrRes = await request<{
    attribute_definitions: Array<{
      code?: string | null
      name?: string
      data_type?: string | null
      unit?: string | null
      is_comparable?: boolean
      is_active?: boolean
    }>
  }>(`/admin/product-cloud/categories/${category.id}/attributes`)
  return (attrRes.attribute_definitions ?? []).flatMap((attribute) => {
    if (attribute.is_comparable !== true || attribute.is_active === false) return []
    const code = attribute.code?.trim() || ""
    const name = attribute.name?.trim() || ""
    const dataType = attribute.data_type?.trim() || ""
    if (!code || !name || !COMPARABLE_DATA_TYPES.has(dataType)) return []
    return [{ code, name, dataType, unit: attribute.unit?.trim() || null }]
  })
}

export async function fetchFilterableCategoryAttributes(slug: string): Promise<
  Array<{ code: string; name: string }>
> {
  const normalized = slug.trim().toLowerCase()
  const catRes = await request<{
    categories: Array<{ id: string; name: string; slug?: string | null }>
  }>("/admin/product-cloud/categories")
  const category =
    catRes.categories.find((row) => (row.slug ?? "").trim().toLowerCase() === normalized) ??
    catRes.categories.find((row) => row.name.trim().toLowerCase().replace(/\s+/g, "-") === normalized)
  if (!category) return []
  const attrRes = await request<{
    attribute_definitions: Array<{
      code?: string | null
      name?: string
      is_filterable?: boolean
      is_active?: boolean
    }>
  }>(`/admin/product-cloud/categories/${category.id}/attributes`)
  return (attrRes.attribute_definitions ?? []).flatMap((attribute) => {
    if (attribute.is_filterable !== true || attribute.is_active === false) return []
    const code = attribute.code?.trim() || ""
    if (!code) return []
    return [{ code, name: attribute.name?.trim() || code }]
  })
}

export async function fetchPublicCatalogBrands() {
  const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
  const res = await fetch(`${medusaBackendUrl()}/store/catalog/brands`, {
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "x-publishable-api-key": key } : {}),
    },
  })
  if (!res.ok) return [] as Array<{ id: string; name: string; slug: string }>
  const body = (await res.json()) as {
    brands?: Array<{ id?: string; name?: string; slug?: string }>
  }
  return (body.brands ?? []).flatMap((brand) => {
    const slug = brand.slug?.trim() ?? ""
    const name = brand.name?.trim() ?? ""
    if (!slug || !name) return []
    return [{ id: brand.id || slug, name, slug }]
  })
}

export async function fetchPublicCategoryAttributes(slug: string) {
  const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
  const qs = new URLSearchParams({ slug })
  const res = await fetch(
    `${medusaBackendUrl()}/store/product-cloud/categories?${qs}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "x-publishable-api-key": key } : {}),
      },
    }
  )
  if (!res.ok) return [] as Array<{ code: string; name: string }>
  const body = (await res.json()) as {
    categories?: Array<{
      attributes?: Array<{ code?: string | null; name?: string; is_filterable?: boolean }>
    }>
  }
  const attributes = body.categories?.[0]?.attributes ?? []
  return attributes
    .filter((attribute) => attribute.is_filterable && (attribute.code || attribute.name))
    .map((attribute) => ({
      code: attribute.code || attribute.name || "",
      name: attribute.name || attribute.code || "",
    }))
}

export function getCmsTranslateStatus() {
  return request<{ configured: boolean; provider: string; message: string }>(
    "/admin/cms/translate"
  )
}

export function postCmsTranslate(body: {
  text: string
  source_language: string
  target_language: string
}) {
  return request<{ text: string; provider: string; origin: string }>(
    "/admin/cms/translate",
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function createCmsPage(body: Partial<CmsPageDto>) {
  return request<{ page: CmsPageDto }>("/admin/cms/pages", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function updateCmsPage(id: string, body: Partial<CmsPageDto>) {
  return request<{ page: CmsPageDto }>(`/admin/cms/pages/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function deleteCmsPage(id: string) {
  return request<{ id: string; deleted: boolean }>(`/admin/cms/pages/${id}`, {
    method: "DELETE",
  })
}

export type CmsMediaAssetDto = {
  id: string
  placement: string
  url: string
  mime_type: string
  original_filename: string | null
  size_bytes: number
  width: number | null
  height: number | null
  alt: LocalizedCms
  caption: LocalizedCms
}

export function listCmsMedia(query: { q?: string; placement?: string; mime?: string } = {}) {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.placement) params.set("placement", query.placement)
  if (query.mime) params.set("mime", query.mime)
  const suffix = params.toString() ? `?${params.toString()}` : ""
  return request<{ assets: CmsMediaAssetDto[] }>(`/admin/cms/media${suffix}`)
}

export function updateCmsMediaText(id: string, body: { alt: LocalizedCms }) {
  return request<{ asset: CmsMediaAssetDto; migrated_caption?: LocalizedCms | null }>(
    `/admin/cms/media/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ alt: body.alt }),
    }
  )
}

export async function uploadCmsMedia(file: File, placement: string, assetId?: string) {
  const form = new FormData()
  form.append("file", file)
  form.append("placement", placement)
  if (assetId) form.append("asset_id", assetId)
  // Optional client dims for server validation (also when MIME is empty/odd)
  try {
    const mime = normalizeMediaMimeType(file.type, file.name)
    if (mime.startsWith("image/") && mime !== "image/svg+xml") {
      const dims = await readImageDimensions(file)
      if (dims) {
        form.append("width", String(dims.width))
        form.append("height", String(dims.height))
      }
    }
  } catch {
    /* ignore */
  }
  return request<{ asset: CmsMediaAssetDto }>("/admin/cms/media", {
    method: "POST",
    body: form,
  })
}

export type CommercialNavIconDto = {
  key: string
  slug: string
  name: string
  icon_url: string | null
  storage_reference: string | null
  has_icon: boolean
}

export function listCommercialNavIcons() {
  return request<{ icons: CommercialNavIconDto[] }>(
    "/admin/cms/commercial-nav/icons"
  )
}

export function saveCommercialNavIcon(key: string, storageReference: string) {
  return request<{
    icon: {
      key: string
      storage_reference: string
      icon_url: string | null
    }
  }>(`/admin/cms/commercial-nav/icons/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ storage_reference: storageReference }),
  })
}

export function deleteCommercialNavIcon(key: string) {
  return request<{ deleted: boolean; key: string }>(
    `/admin/cms/commercial-nav/icons/${encodeURIComponent(key)}`,
    { method: "DELETE" }
  )
}
