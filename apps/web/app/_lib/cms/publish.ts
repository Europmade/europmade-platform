/**
 * CMS publish helpers — visibility + schedule (frontend mock until Admin CMS).
 */

export type CmsPublishMeta = {
  /** Soft visibility flag from CMS. */
  visible: boolean
  /** Lower = earlier. */
  sortOrder: number
  /** ISO date; null/undefined = immediately publishable. */
  publishAt?: string | null
  /** ISO date; null/undefined = no expiry. */
  expiresAt?: string | null
}

export function isCmsEntryLive(
  entry: CmsPublishMeta,
  now: Date = new Date()
): boolean {
  if (!entry.visible) return false
  if (entry.publishAt) {
    const start = new Date(entry.publishAt)
    if (!Number.isNaN(start.getTime()) && start > now) return false
  }
  if (entry.expiresAt) {
    const end = new Date(entry.expiresAt)
    if (!Number.isNaN(end.getTime()) && end <= now) return false
  }
  return true
}

export function sortByCmsOrder<T extends CmsPublishMeta>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder)
}
