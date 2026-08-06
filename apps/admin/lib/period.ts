/**
 * Generieke periode voor Admin Dashboard-KPI's.
 * UI nu; bereik klaar om later aan API-queries te koppelen.
 */

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

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "today", label: "Vandaag" },
  { key: "yesterday", label: "Gisteren" },
  { key: "this_week", label: "Deze week" },
  { key: "previous_week", label: "Vorige week" },
  { key: "this_month", label: "Deze maand" },
  { key: "previous_month", label: "Vorige maand" },
  { key: "this_quarter", label: "Dit kwartaal" },
  { key: "previous_quarter", label: "Vorig kwartaal" },
  { key: "this_year", label: "Dit jaar" },
  { key: "all_time", label: "Gehele periode" },
]

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

/** ISO-week: maandag als start. */
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
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return false
  if (range.from && t < range.from.getTime()) return false
  if (t >= range.to.getTime()) return false
  return true
}

/**
 * Vorige periode t.o.v. de gekozen periode (voor KPI-vergelijking).
 * `all_time` heeft geen vorige periode → null.
 */
export function resolvePreviousPeriodRange(
  key: PeriodKey,
  now = new Date()
): PeriodRange | null {
  switch (key) {
    case "today":
      return resolvePeriodRange("yesterday", now)
    case "yesterday": {
      const y = resolvePeriodRange("yesterday", now)
      if (!y.from) return null
      const from = new Date(y.from)
      from.setDate(from.getDate() - 1)
      return { key: "yesterday", from, to: y.from }
    }
    case "this_week":
      return resolvePeriodRange("previous_week", now)
    case "previous_week": {
      const prev = resolvePeriodRange("previous_week", now)
      if (!prev.from) return null
      const from = new Date(prev.from)
      from.setDate(from.getDate() - 7)
      return { key: "previous_week", from, to: prev.from }
    }
    case "this_month":
      return resolvePeriodRange("previous_month", now)
    case "previous_month": {
      const prev = resolvePeriodRange("previous_month", now)
      if (!prev.from) return null
      const from = startOfMonth(
        new Date(prev.from.getFullYear(), prev.from.getMonth() - 1, 1)
      )
      return { key: "previous_month", from, to: prev.from }
    }
    case "this_quarter":
      return resolvePeriodRange("previous_quarter", now)
    case "previous_quarter": {
      const prev = resolvePeriodRange("previous_quarter", now)
      if (!prev.from) return null
      const from = startOfDay(
        new Date(prev.from.getFullYear(), prev.from.getMonth() - 3, 1)
      )
      return { key: "previous_quarter", from, to: prev.from }
    }
    case "this_year": {
      const y = now.getFullYear()
      return {
        key: "this_year",
        from: startOfDay(new Date(y - 1, 0, 1)),
        to: startOfDay(new Date(y, 0, 1)),
      }
    }
    case "all_time":
      return null
  }
}
