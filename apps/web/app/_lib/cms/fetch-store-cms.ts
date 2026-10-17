/**
 * Fetch published CMS from Medusa store APIs.
 */

import type { EuMarketCode } from "@europmade/types"
import { rewriteMediaStrings } from "@europmade/utils"
import type { HomepageCmsDocument } from "../cms/homepage-cms"
import type { LocalizedString } from "../i18n/locales"
import { getPageBackendOrigin } from "../page-backend-origin"
import { medusaBackendUrl } from "../medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type StoreCmsBanner = {
  id: string
  position: number
  location: string
  title: LocalizedString
  subtitle: LocalizedString
  cta_label: LocalizedString
  destination_url: string
  link_type: string
  image_url: string | null
  image_alt: LocalizedString
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
  published: boolean
}

export type StoreCmsHomepageResponse = {
  market: EuMarketCode | null
  homepage: {
    document: HomepageCmsDocument
    seo_title: LocalizedString | null
    seo_description: LocalizedString | null
    seo_canonical: string | null
    og_title: LocalizedString | null
    og_description: LocalizedString | null
    published: boolean
  } | null
  banners: StoreCmsBanner[]
}

export async function fetchStoreCmsCategory(slug: string): Promise<{
  category: {
    category_slug: string
    document: unknown
    published: boolean
  } | null
} | null> {
  try {
    const res = await fetch(
      `${medusaBackendUrl()}/store/cms/categories/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      category: {
        category_slug: string
        document: unknown
        published: boolean
      } | null
    }
    return rewriteMediaStrings(data, await getPageBackendOrigin())
  } catch {
    return null
  }
}

export type StoreCmsPageDto = {
  slug: string
  title: LocalizedString
  body: LocalizedString
  seo_title: LocalizedString | null
  seo_description: LocalizedString | null
  seo_canonical: string | null
  cover_url: string | null
  document?: unknown
  published: boolean
  visible: boolean
  publish_at?: string | null
  expires_at?: string | null
}

export async function fetchStoreCmsPage(
  slug: string
): Promise<{ page: StoreCmsPageDto } | null> {
  try {
    const res = await fetch(
      `${medusaBackendUrl()}/store/cms/pages/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { page: StoreCmsPageDto }
    return rewriteMediaStrings(data, await getPageBackendOrigin())
  } catch {
    return null
  }
}

export async function fetchStoreCmsHomepage(
  market: EuMarketCode
): Promise<StoreCmsHomepageResponse | null> {
  try {
    const res = await fetch(
      `${medusaBackendUrl()}/store/cms/homepage?market=${encodeURIComponent(market)}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as StoreCmsHomepageResponse
    return rewriteMediaStrings(data, await getPageBackendOrigin())
  } catch {
    return null
  }
}

export async function fetchStoreCmsProduct(productId: string): Promise<{
  product: {
    product_id: string
    document: unknown
    published: boolean
  } | null
} | null> {
  try {
    const res = await fetch(
      `${medusaBackendUrl()}/store/cms/products/${encodeURIComponent(productId)}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      product: {
        product_id: string
        document: unknown
        published: boolean
      } | null
    }
    return rewriteMediaStrings(data, await getPageBackendOrigin())
  } catch {
    return null
  }
}

/** Published global product template (`product_id = "template"`). */
export async function fetchStoreCmsProductTemplate(): Promise<{
  product: {
    product_id: string
    document: unknown
    published: boolean
  } | null
} | null> {
  return fetchStoreCmsProduct("template")
}

export async function fetchStoreCmsBanners(opts?: {
  location?: string
  market?: string
}): Promise<StoreCmsBanner[]> {
  try {
    const q = new URLSearchParams()
    if (opts?.location) q.set("location", opts.location)
    if (opts?.market) q.set("market", opts.market)
    const qs = q.toString()
    const res = await fetch(
      `${medusaBackendUrl()}/store/cms/banners${qs ? `?${qs}` : ""}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
      }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { banners?: StoreCmsBanner[] }
    const rewritten = rewriteMediaStrings(
      data,
      await getPageBackendOrigin()
    ) as { banners?: StoreCmsBanner[] }
    return Array.isArray(rewritten.banners) ? rewritten.banners : []
  } catch {
    return []
  }
}
