/**
 * CMS publish helpers — visibility + schedule.
 * Page-level live check: @europmade/utils `isCmsPageLive`.
 */

import { isCmsScheduleWindowLive } from "@europmade/utils"

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
  return isCmsScheduleWindowLive(
    {
      publish_at: entry.publishAt ?? null,
      expires_at: entry.expiresAt ?? null,
    },
    now
  )
}

export function sortByCmsOrder<T extends CmsPublishMeta>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder)
}
