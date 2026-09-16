/**
 * Storefront Product Cloud client (ADR-0038).
 * Public store categories + translation resolve. Failures return null — pages keep CMS fallback.
 */

import type { StorefrontLocale } from "./i18n/locales"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type ProductCloudStoreAttribute = {
  id: string
  code: string | null
  name: string
  data_type: string
  unit: string | null
  is_required: boolean
  is_filterable: boolean
  is_comparable: boolean
  sort_order: number
  option_values: string | null
  name_resolution?: {
    source: "source" | "translation" | "missing"
    translation_status: string | null
  }
}

export type ProductCloudStoreCategory = {
  id: string
  name: string
  slug: string | null
  parent_category_id: string | null
  locale: string | null
  name_resolution: {
    source: "source" | "translation" | "missing"
    translation_status: string | null
  }
  attributes: ProductCloudStoreAttribute[]
}

async function storeFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
        ...init?.headers,
      },
      next: { revalidate: 60 },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

/**
 * Fetch one Product Cloud category by storefront slug + locale.
 * Returns null when missing / backend down (safe fallback).
 */
export async function fetchStorefrontCategories(
  locale: StorefrontLocale
): Promise<ProductCloudStoreCategory[] | null> {
  const qs = new URLSearchParams({ locale })
  const data = await storeFetch<{ categories: ProductCloudStoreCategory[] }>(
    `/store/product-cloud/categories?${qs.toString()}`
  )
  return data?.categories ?? null
}

export async function fetchProductCloudCategoryBySlug(
  slug: string,
  locale: StorefrontLocale
): Promise<ProductCloudStoreCategory | null> {
  const qs = new URLSearchParams({
    slug,
    locale,
  })
  const data = await storeFetch<{ categories: ProductCloudStoreCategory[] }>(
    `/store/product-cloud/categories?${qs.toString()}`
  )
  return data?.categories?.find((c) => c.slug === slug) ?? null
}

export async function fetchCategoryRedirect(
  fromSlug: string
): Promise<string | null> {
  const qs = new URLSearchParams({ from: fromSlug })
  const data = await storeFetch<{
    redirect: { from_slug: string; to_slug: string } | null
  }>(`/store/product-cloud/category-redirects?${qs.toString()}`)
  const to = data?.redirect?.to_slug?.trim()
  if (!to || to === fromSlug) return null
  return to
}

export function productCloudFilterableAttributes(
  category: ProductCloudStoreCategory | null
): ProductCloudStoreAttribute[] {
  if (!category) return []
  return category.attributes
    .filter((a) => a.is_filterable)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function productCloudComparableAttributes(
  category: ProductCloudStoreCategory | null
): ProductCloudStoreAttribute[] {
  if (!category) return []
  return category.attributes
    .filter((a) => a.is_comparable)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function parseOptionValues(
  raw: string | null
): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string")
    }
  } catch {
    /* plain CSV fallback */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}
