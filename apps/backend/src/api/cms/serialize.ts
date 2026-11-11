import {
  isEuMarketCode,
  isVisibleInMarket,
  type EuMarketCode,
  type MarketScope,
} from "@europmade/types"
import {
  isCmsPageLive,
  isCmsScheduleWindowLive,
  persistMediaReference,
  resolveMediaUrl,
  rewriteMediaStrings,
} from "@europmade/utils"

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
  if (!isCmsScheduleWindowLive(row, now)) return false
  return isVisibleInMarket(
    {
      marketScope: parseMarketScope(row.market_scope),
      markets: parseMarkets(row.markets),
    },
    visitorMarket
  )
}

/** Storefront live check for cms_page (published + visible + schedule). */
export function pageIsLive(
  row: {
    published: boolean
    visible: boolean
    publish_at?: Date | string | null
    expires_at?: Date | string | null
  },
  now = new Date()
): boolean {
  return isCmsPageLive(row, now)
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
    presentation:
      row.presentation && typeof row.presentation === "object"
        ? row.presentation
        : null,
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

export function persistCmsPageDocument(
  document: unknown
): Record<string, unknown> {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return {}
  }
  const next = { ...(document as Record<string, unknown>) }
  if (typeof next.banner_url === "string") {
    next.banner_url = persistMediaReference(next.banner_url)
  }
  return next
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
  const publishedVersion = Number(row.published_version ?? 0)
  const hasPublished =
    publishedVersion >= 1 &&
    row.published_document != null &&
    typeof row.published_document === "object"
  const liveDocument = hasPublished
    ? row.published_document
    : row.published
      ? row.document
      : {}
  return {
    id: row.id,
    category_slug: String(row.category_slug ?? ""),
    /** @deprecated Prefer published.document from serializeCmsCategoryPd */
    document: rewriteMediaStrings(liveDocument ?? {}, backendOrigin),
    published: hasPublished || Boolean(row.published),
    published_version: publishedVersion,
    draft_sync_state: String(row.draft_sync_state ?? "absent"),
    i18n_meta: (row.i18n_meta as Record<string, unknown> | null) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Admin Published/Draft payload (design §10.1 GET).
 * Never includes draft content in a field named for storefront use.
 */
export function serializeCmsCategoryPd(
  row: Record<string, unknown>,
  opts?: { restoredFromVersion?: number | null; backendOrigin?: string }
) {
  const backendOrigin = opts?.backendOrigin ?? "http://localhost:9000"
  const publishedVersion = Number(row.published_version ?? 0)
  const hasPublished =
    publishedVersion >= 1 &&
    row.published_document != null &&
    typeof row.published_document === "object"
  const draftDocument = row.draft_document
  const hasDraft = draftDocument != null && typeof draftDocument === "object"
  const draftBaseVersion =
    row.draft_base_version == null ? null : Number(row.draft_base_version)
  const staleBase =
    hasDraft &&
    publishedVersion > 0 &&
    Number(draftBaseVersion ?? NaN) !== publishedVersion

  return {
    id: row.id,
    category_slug: String(row.category_slug ?? ""),
    i18n_meta: (row.i18n_meta as Record<string, unknown> | null) ?? null,
    published: hasPublished
      ? {
          document: rewriteMediaStrings(
            row.published_document ?? {},
            backendOrigin
          ),
          version: publishedVersion,
          at: row.published_at ?? null,
          by: row.published_by ?? null,
          note: row.published_note ?? null,
        }
      : null,
    draft: hasDraft
      ? {
          document: rewriteMediaStrings(draftDocument ?? {}, backendOrigin),
          base_version: draftBaseVersion,
          revision: Number(row.draft_revision ?? 0),
          sync_state: String(row.draft_sync_state ?? "unpublished_changes"),
          updated_at: row.draft_updated_at ?? null,
          updated_by: row.draft_updated_by ?? null,
          restored_from_version: opts?.restoredFromVersion ?? null,
        }
      : null,
    stale_base: staleBase,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Storefront: only published_document, never draft. */
export function serializeCmsCategoryStore(
  row: Record<string, unknown>,
  backendOrigin = "http://localhost:9000"
) {
  const publishedVersion = Number(row.published_version ?? 0)
  const hasPublished =
    publishedVersion >= 1 &&
    row.published_document != null &&
    typeof row.published_document === "object"
  if (!hasPublished) return null
  return {
    id: row.id,
    category_slug: String(row.category_slug ?? ""),
    document: rewriteMediaStrings(row.published_document ?? {}, backendOrigin),
    published: true,
    published_version: publishedVersion,
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
