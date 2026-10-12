/**
 * Eén reeks voor 30, 60 en 90 dagen zonder bestelling.
 * De motor telt delay_minutes op bij het moment waarop de vorige stap is verwerkt.
 * Daarom is de opgeslagen wachttijd de tussenstap (0, 30, 30), niet 30, 60 en 90.
 * Het echte verzendmoment blijft de laatste bestelling of het account, plus 30, 60 of 90 dagen.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTES_PER_DAY = 24 * 60

export const INACTIVITY_MILESTONE_DAYS = [30, 60, 90] as const
/** Tussenstappen. Niet optellen als 30 + 60 + 90. */
export const INACTIVITY_GAP_DAYS = [0, 30, 30] as const

export function inactivityDelayMinutes(stepOrder: number): number {
  const gap = INACTIVITY_GAP_DAYS[stepOrder - 1]
  if (gap == null) throw new Error("Onbekende stap in de inactiviteitsreeks.")
  return gap * MINUTES_PER_DAY
}

export function inactivityMilestoneAt(reference: Date, stepOrder: number): Date {
  const days = INACTIVITY_MILESTONE_DAYS[stepOrder - 1]
  if (days == null) throw new Error("Onbekende stap in de inactiviteitsreeks.")
  return new Date(reference.getTime() + days * DAY_MS)
}

export function inactiveOccurrenceKey(consumerId: string, reference: string): string {
  return `consumer_inactive_30d:${consumerId}:${new Date(reference).toISOString()}`
}

export function referenceFromInactiveKey(key: string | null | undefined): string | null {
  const value = key?.trim() ?? ""
  const marker = "consumer_inactive_30d:"
  if (!value.startsWith(marker)) return null
  const rest = value.slice(marker.length)
  const split = rest.indexOf(":")
  if (split < 1) return null
  const reference = rest.slice(split + 1).trim()
  const time = new Date(reference).getTime()
  if (!reference || Number.isNaN(time)) return null
  return new Date(time).toISOString()
}

export function orderedAfterReference(
  orders: Array<{ created_at: string }>,
  referenceIso: string
): boolean {
  const reference = new Date(referenceIso).getTime()
  if (Number.isNaN(reference)) return true
  return orders.some((order) => {
    const at = new Date(order.created_at).getTime()
    return Number.isFinite(at) && at > reference
  })
}
