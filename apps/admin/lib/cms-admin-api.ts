/**
 * Admin CMS API client — Medusa /admin/cms/*
 */

import { medusaBackendUrl } from "./medusa-backend-url"
import { normalizeMediaMimeType, readImageDimensions } from "@europmade/utils"

export class CmsAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "CmsAdminApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${medusaBackendUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Er is iets misgegaan. Probeer het opnieuw."
    throw new CmsAdminApiError(message, response.status)
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
  i18n_meta?: Record<string, unknown> | null
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
  return request<{ homepage: CmsHomepageDto | null; markets: string[] }>(
    "/admin/cms/homepage"
  )
}

export function putCmsHomepage(body: Record<string, unknown>) {
  return request<{ homepage: CmsHomepageDto }>("/admin/cms/homepage", {
    method: "PUT",
    body: JSON.stringify(body),
  })
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
  return request<{ category: CmsCategoryDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}`
  )
}

export function putCmsEditorialCategory(
  slug: string,
  body: { document: unknown; published: boolean; i18n_meta?: unknown }
) {
  return request<{ category: CmsCategoryDto }>(
    `/admin/cms/categories/${encodeURIComponent(slug)}`,
    { method: "PUT", body: JSON.stringify(body) }
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

export async function uploadCmsMedia(file: File, placement: string) {
  const form = new FormData()
  form.append("file", file)
  form.append("placement", placement)
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
  return request<{
    asset: {
      id: string
      url: string
      placement: string
      mime_type: string
      width: number | null
      height: number | null
    }
  }>("/admin/cms/media", { method: "POST", body: form })
}
