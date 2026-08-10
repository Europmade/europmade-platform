/**
 * Periodefilter voor Seller Dashboard-KPI's (zelfde model als admin cockpit).
 */

import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t, type StorefrontMessageKey } from "../../_lib/i18n/messages"

export type PeriodKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "previous_week"
  | "this_month"
  | "previous_month"
  | "this_quarter"
  | "previous_quarter"
  | "this_year"
  | "all_time"

export type PeriodOption = {
  key: PeriodKey
  label: string
}

type PeriodOptionDef = {
  key: PeriodKey
  labelKey: StorefrontMessageKey
}

export const PERIOD_OPTIONS: PeriodOptionDef[] = [
  { key: "today", labelKey: "periodToday" },
  { key: "this_week", labelKey: "periodThisWeek" },
  { key: "this_month", labelKey: "periodThisMonth" },
  { key: "previous_month", labelKey: "periodPreviousMonth" },
  { key: "this_quarter", labelKey: "periodThisQuarter" },
  { key: "this_year", labelKey: "periodThisYear" },
]

/** Localized period options for the current storefront locale. */
export function periodOptions(locale: StorefrontLocale): PeriodOption[] {
  return PERIOD_OPTIONS.map((opt) => ({
    key: opt.key,
    label: t(opt.labelKey, locale),
  }))
}

export type PeriodRange = {
  key: PeriodKey
  from: Date | null
  to: Date
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

export function resolvePeriodRange(
  key: PeriodKey,
  now = new Date()
): PeriodRange {
  const to = now
  const today = startOfDay(now)

  switch (key) {
    case "today":
      return { key, from: today, to }
    case "yesterday": {
      const from = startOfDay(now)
      from.setDate(from.getDate() - 1)
      return { key, from, to: today }
    }
    case "this_week":
      return { key, from: startOfWeek(now), to }
    case "previous_week": {
      const thisWeek = startOfWeek(now)
      const from = new Date(thisWeek)
      from.setDate(from.getDate() - 7)
      return { key, from, to: thisWeek }
    }
    case "this_month":
      return { key, from: startOfMonth(now), to }
    case "previous_month": {
      const from = startOfMonth(
        new Date(now.getFullYear(), now.getMonth() - 1, 1)
      )
      return { key, from, to: startOfMonth(now) }
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3)
      return {
        key,
        from: startOfDay(new Date(now.getFullYear(), q * 3, 1)),
        to,
      }
    }
    case "previous_quarter": {
      const q = Math.floor(now.getMonth() / 3)
      const thisQStart = startOfDay(new Date(now.getFullYear(), q * 3, 1))
      const prevQStart = startOfDay(new Date(now.getFullYear(), q * 3 - 3, 1))
      return { key, from: prevQStart, to: thisQStart }
    }
    case "this_year":
      return {
        key,
        from: startOfDay(new Date(now.getFullYear(), 0, 1)),
        to,
      }
    case "all_time":
      return { key, from: null, to }
  }
}

export function isInPeriod(
  iso: string | Date | null | undefined,
  range: PeriodRange
): boolean {
  if (!iso) return false
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return false
  if (range.from && ts < range.from.getTime()) return false
  if (ts >= range.to.getTime()) return false
  return true
}
