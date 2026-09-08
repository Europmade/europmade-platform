import {
  isEuMarketCode,
  isVisibleInMarket,
  type EuMarketCode,
  type MarketScope,
} from "@europmade/types"
import { resolveMediaUrl, rewriteMediaStrings } from "@europmade/utils"

export type LocalizedCmsString = {
  nl: string
  en: string
  de: string
  fr: string
}

export function emptyLocalized(): LocalizedCmsString {
  return { nl: "", en: "", de: "", fr: "" }
}

export function asLocalized(value: unknown): LocalizedCmsString {
  if (!value || typeof value !== "object") return emptyLocalized()
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

export function parseMarketScope(value: unknown): MarketScope {
  return value === "selected" ? "selected" : "all"
}

export function parseMarkets(value: unknown): EuMarketCode[] {
  if (!Array.isArray(value)) return []
  const out: EuMarketCode[] = []
  for (const item of value) {
    if (typeof item !== "string") continue
    const code = item.trim().toUpperCase()
    if (isEuMarketCode(code) && !out.includes(code)) out.push(code)
  }
  return out
}

export function bannerIsLive(row: {
  published: boolean
  visible: boolean
  publish_at?: Date | string | null
  expires_at?: Date | string | null
  market_scope: string
  markets: unknown
}, visitorMarket: string | null | undefined, now = new Date()): boolean {
  if (!row.published || !row.visible) return false
  if (row.publish_at) {
    const start = new Date(row.publish_at)
    if (!Number.isNaN(start.getTime()) && start > now) return false
  }
  if (row.expires_at) {
    const end = new Date(row.expires_at)
    if (!Number.isNaN(end.getTime()) && end <= now) return false
  }
  return isVisibleInMarket(
    {
      marketScope: parseMarketScope(row.market_scope),
      markets: parseMarkets(row.markets),
    },
    visitorMarket
  )
}

export function serializeBanner(
  row: Record<string, unknown>,
  backendOrigin = "http://localhost:9000"
) {
  return {
    id: row.id,
    position: Number(row.position ?? 1),
    location: String(row.location ?? "homepage"),
    title: asLocalized(row.title),
    subtitle: asLocalized(row.subtitle),
    cta_label: asLocalized(row.cta_label),
    destination_url: String(row.destination_url ?? ""),
    link_type: String(row.link_type ?? "category"),
    image_url: resolveMediaUrl(
      (row.image_url as string | null) ?? null,
      backendOrigin
    ),
    image_alt: asLocalized(row.image_alt),
    background: (row.background as string | null) ?? null,
    logo_url: resolveMediaUrl(
      (row.logo_url as string | null) ?? null,
      backendOrigin
    ),
    market_scope: parseMarketScope(row.market_scope),
    markets: parseMarkets(row.markets),
    visible: Boolean(row.visible),
    sort_order: Number(row.sort_order ?? 0),
    publish_at: row.publish_at ?? null,
    expires_at: row.expires_at ?? null,
    published: Boolean(row.published),
    asset_id: (row.asset_id as string | null) ?? null,
    i18n_meta: (row.i18n_meta as Record<string, unknown> | null) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializePage(
  row: Record<string, unknown>,
  backendOrigin = "http://localhost:9000"
) {
  return {
    id: row.id,
    slug: String(row.slug ?? ""),
    title: asLocalized(row.title),
    body: asLocalized(row.body),
    seo_title: row.seo_title ? asLocalized(row.seo_title) : null,
    seo_description: row.seo_description
      ? asLocalized(row.seo_description)
      : null,
    seo_canonical: (row.seo_canonical as string | null) ?? null,
    published: Boolean(row.published),
    visible: Boolean(row.visible),
    sort_order: Number(row.sort_order ?? 0),
    publish_at: row.publish_at ?? null,
    expires_at: row.expires_at ?? null,
    cover_url: resolveMediaUrl(
      (row.cover_url as string | null) ?? null,
      backendOrigin
    ),
    document: rewriteMediaStrings(
      row.document && typeof row.document === "object" ? row.document : {},
      backendOrigin
    ),
    i18n_meta: (row.i18n_meta as Record<string, unknown> | null) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializeHomepage(
  row: Record<string, unknown>,
  backendOrigin = "http://localhost:9000"
) {
  return {
    id: row.id,
    document_key: String(row.document_key ?? "default"),
    document: rewriteMediaStrings(row.document ?? {}, backendOrigin),
    seo_title: row.seo_title ? asLocalized(row.seo_title) : null,
    seo_description: row.seo_description
      ? asLocalized(row.seo_description)
      : null,
    seo_canonical: (row.seo_canonical as string | null) ?? null,
    og_title: row.og_title ? asLocalized(row.og_title) : null,
    og_description: row.og_description
      ? asLocalized(row.og_description)
      : null,
    published: Boolean(row.published),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializeCmsCategory(
  row: Record<string, unknown>,
  backendOrigin = "http://localhost:9000"
) {
  return {
    id: row.id,
    category_slug: String(row.category_slug ?? ""),
    document: rewriteMediaStrings(row.document ?? {}, backendOrigin),
    published: Boolean(row.published),
    i18n_meta: (row.i18n_meta as Record<string, unknown> | null) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializeCmsProduct(
  row: Record<string, unknown>,
  backendOrigin = "http://localhost:9000"
) {
  return {
    id: row.id,
    product_id: String(row.product_id ?? ""),
    document: rewriteMediaStrings(row.document ?? {}, backendOrigin),
    published: Boolean(row.published),
    i18n_meta: (row.i18n_meta as Record<string, unknown> | null) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
