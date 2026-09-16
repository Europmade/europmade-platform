/**
 * Commercial action landing pages stored as cms_page (not pc_category).
 * Public URL: /acties/{slug}. Visibility uses cms-publish helpers.
 */

export type CmsActionKind = "action"

export function isCmsActionDocument(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false
  return (doc as { kind?: unknown }).kind === "action"
}

export function publicActionPath(slug: string): string {
  const s = slug
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/^acties\//, "")
  return `/acties/${s}`
}

/** Dead `collectie=` search links → real action URL when a campaign slug exists. */
export function rewriteCollectionHrefToAction(
  href: string,
  slug: string
): string {
  const s = slug.trim()
  if (!s) return href
  const h = href.trim()
  if (!h || h === "/zoeken" || /[?&]collectie=/.test(h)) {
    return publicActionPath(s)
  }
  return h
}

export function parseCmsActionBannerUrl(doc: unknown): string | null {
  if (!doc || typeof doc !== "object") return null
  const v = (doc as { banner_url?: unknown }).banner_url
  if (typeof v !== "string") return null
  const trimmed = v.trim()
  return trimmed || null
}

export function parseCmsActionProductIds(doc: unknown): string[] {
  if (!doc || typeof doc !== "object") return []
  const raw = (doc as { product_ids?: unknown }).product_ids
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const id of raw) {
    if (typeof id !== "string") continue
    const trimmed = id.trim()
    if (!trimmed || out.includes(trimmed)) continue
    out.push(trimmed)
  }
  return out
}
