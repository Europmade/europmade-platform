/**
 * Shared CMS publish / schedule helpers (pages, banners, section meta).
 * Single source of truth — no parallel status enum.
 */

export type CmsPublishWindow = {
  publish_at?: Date | string | null
  expires_at?: Date | string | null
}

export type CmsPageLiveInput = CmsPublishWindow & {
  published: boolean
  visible: boolean
}

/** Derived UI labels only — not stored as a separate DB status. */
export type CmsDerivedPageStatus = "concept" | "planned" | "active" | "expired"

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** True when now is inside [publish_at, expires_at) (null bounds = open). */
export function isCmsScheduleWindowLive(
  row: CmsPublishWindow,
  now: Date = new Date()
): boolean {
  const start = asDate(row.publish_at ?? null)
  if (start && start > now) return false
  const end = asDate(row.expires_at ?? null)
  if (end && end <= now) return false
  return true
}

/**
 * Live storefront visibility for cms_page (and similar rows).
 * Concept / planned / expired → not live. Row is retained in DB.
 */
export function isCmsPageLive(
  row: CmsPageLiveInput,
  now: Date = new Date()
): boolean {
  if (!row.published || !row.visible) return false
  return isCmsScheduleWindowLive(row, now)
}

export function deriveCmsPageStatus(
  row: CmsPageLiveInput,
  now: Date = new Date()
): CmsDerivedPageStatus {
  if (!row.published) return "concept"
  const end = asDate(row.expires_at ?? null)
  if (end && end <= now) return "expired"
  const start = asDate(row.publish_at ?? null)
  if (start && start > now) return "planned"
  if (!row.visible) return "concept"
  return "active"
}
