/**
 * Category CMS image references.
 * Alt text stays on cms_asset.alt_text as localized strings.
 * Captions stay on the V2 block. A previous nested { alt, caption } value is
 * only read so that caption can move to the block; it is never written back.
 */

export type CmsAssetLocaleText = {
  nl: string
  en: string
  de: string
  fr: string
}

const LOCALES = ["nl", "en", "de", "fr"] as const

export function emptyCmsAssetLocaleText(): CmsAssetLocaleText {
  return { nl: "", en: "", de: "", fr: "" }
}

export function cmsAssetLocaleText(value: unknown): CmsAssetLocaleText {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    nl: typeof row.nl === "string" ? row.nl : "",
    en: typeof row.en === "string" ? row.en : "",
    de: typeof row.de === "string" ? row.de : "",
    fr: typeof row.fr === "string" ? row.fr : "",
  }
}

export function cmsAssetLocaleHasText(value: CmsAssetLocaleText | null | undefined): boolean {
  if (!value) return false
  return LOCALES.some((locale) => value[locale].trim().length > 0)
}

/**
 * Read alt text from cms_asset.alt_text.
 * Flat { nl, en, de, fr } is the stored shape.
 * Nested { alt, caption } is accepted from older library saves and split apart.
 */
export function readCmsAssetAltText(value: unknown): {
  alt: CmsAssetLocaleText
  caption: CmsAssetLocaleText
} {
  const empty = emptyCmsAssetLocaleText()
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { alt: empty, caption: empty }
  }
  const row = value as Record<string, unknown>
  const nestedAlt = row.alt
  if (nestedAlt && typeof nestedAlt === "object") {
    return {
      alt: cmsAssetLocaleText(nestedAlt),
      caption: cmsAssetLocaleText(row.caption),
    }
  }
  return { alt: cmsAssetLocaleText(row), caption: empty }
}

/** Persist only localized alt text. Caption is not a key of this object. */
export function cmsAssetAltTextForStorage(alt: unknown): CmsAssetLocaleText {
  return cmsAssetLocaleText(alt)
}

function assetIdOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function urlMap(urls: ReadonlyMap<string, string> | Record<string, string>): Map<string, string> {
  return urls instanceof Map ? urls : new Map(Object.entries(urls))
}

function freshUrl(assetId: unknown, storedUrl: unknown, urls: Map<string, string>): unknown {
  const id = assetIdOf(assetId)
  if (id && urls.has(id)) {
    const next = urls.get(id)
    if (next) return next
  }
  return storedUrl
}

function collectFromImage(image: unknown, into: string[]) {
  if (!image || typeof image !== "object") return
  const id = assetIdOf((image as { asset_id?: unknown }).asset_id)
  if (id) into.push(id)
}

function collectFromHolders(rows: unknown, into: string[]) {
  if (!Array.isArray(rows)) return
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    collectFromImage((row as { image?: unknown }).image, into)
  }
}

/** Asset ids referenced by a category document. URL-only images contribute nothing. */
export function collectCategoryCmsAssetIds(document: unknown): string[] {
  if (!document || typeof document !== "object") return []
  const blocks = (document as { blocks?: unknown }).blocks
  if (!Array.isArray(blocks)) return []
  const ids: string[] = []
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue
    const row = block as Record<string, unknown>
    if (row.type === "hero") {
      const desktop = assetIdOf(row.image_asset_id)
      const mobile = assetIdOf(row.mobile_image_asset_id)
      if (desktop) ids.push(desktop)
      if (mobile) ids.push(mobile)
    }
    if (Array.isArray(row.tile_images)) {
      for (const tile of row.tile_images) {
        if (!tile || typeof tile !== "object") continue
        collectFromImage((tile as { image?: unknown }).image, ids)
      }
    }
    collectFromHolders(row.items, ids)
    collectFromHolders(row.cards, ids)
    collectFromHolders(row.sections, ids)
  }
  return ids
}

function refreshImage(holder: unknown, urls: Map<string, string>) {
  if (!holder || typeof holder !== "object") return
  const image = (holder as { image?: unknown }).image
  if (!image || typeof image !== "object") return
  const img = image as Record<string, unknown>
  img.url = freshUrl(img.asset_id, img.url, urls)
}

function refreshHolders(rows: unknown, urls: Map<string, string>) {
  if (!Array.isArray(rows)) return
  for (const row of rows) refreshImage(row, urls)
}

/**
 * Return a copy whose image URLs come from the asset map when an asset id is set.
 * A block with only a URL is left unchanged. An unknown asset id keeps the stored URL.
 */
export function resolveCategoryCmsAssetUrls<T>(
  document: T,
  urls: ReadonlyMap<string, string> | Record<string, string>
): T {
  if (!document || typeof document !== "object") return document
  const map = urlMap(urls)
  const copy = structuredClone(document) as { blocks?: unknown[] }
  if (!Array.isArray(copy.blocks)) return copy as T
  for (const block of copy.blocks) {
    if (!block || typeof block !== "object") continue
    const row = block as Record<string, unknown>
    if (row.type === "hero") {
      row.image_url = freshUrl(row.image_asset_id, row.image_url, map)
      row.mobile_image_url = freshUrl(row.mobile_image_asset_id, row.mobile_image_url, map)
    }
    if (Array.isArray(row.tile_images)) {
      for (const tile of row.tile_images) refreshImage(tile, map)
    }
    refreshHolders(row.items, map)
    refreshHolders(row.cards, map)
    refreshHolders(row.sections, map)
  }
  return copy as T
}
