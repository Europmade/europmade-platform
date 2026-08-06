/**
 * KPI-contract voor Admin Dashboard — voorbereid op periodevergelijking (Sprint 4).
 * Geen fake data: ontbrekende historische velden blijven null/undefined.
 */

import type { PeriodKey } from "./period"

export type KpiTrendDirection = "up" | "down" | "flat"

/** Historische vergelijkingsvelden — UI toont alleen wat beschikbaar is. */
export type KpiPeriodComparison = {
  currentValue: number | null | undefined
  previousValue: number | null | undefined
  difference: number | null | undefined
  percentageDifference: number | null | undefined
  trend: KpiTrendDirection | null | undefined
  periodKey?: PeriodKey
  /** Bijv. "t.o.v. vorige periode" — alleen tonen bij echte vergelijking. */
  comparisonLabel?: string | null
}

/** Lege vergelijking: alleen current uit bekende waarde, rest bewust null. */
export function emptyPeriodComparison(
  currentValue: number | null | undefined = null
): KpiPeriodComparison {
  return {
    currentValue: currentValue ?? null,
    previousValue: null,
    difference: null,
    percentageDifference: null,
    trend: null,
  }
}

/**
 * Sprint 4-helper: bereken verschil/trend wanneer previous bekend is.
 * Nu ongebruikt in UI; beschikbaar voor latere API-koppeling.
 */
export function computePeriodComparison(
  currentValue: number | null | undefined,
  previousValue: number | null | undefined,
  periodKey?: PeriodKey
): KpiPeriodComparison {
  if (
    currentValue == null ||
    previousValue == null ||
    !Number.isFinite(currentValue) ||
    !Number.isFinite(previousValue)
  ) {
    return {
      ...emptyPeriodComparison(currentValue ?? null),
      periodKey,
    }
  }

  const difference = currentValue - previousValue
  const percentageDifference =
    previousValue === 0
      ? null
      : (difference / Math.abs(previousValue)) * 100

  let trend: KpiTrendDirection | null = "flat"
  if (difference > 0) trend = "up"
  else if (difference < 0) trend = "down"

  return {
    currentValue,
    previousValue,
    difference,
    percentageDifference,
    trend,
    periodKey,
  }
}
