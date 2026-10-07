import {
  countryLabel,
  localeLabel,
  newsletterLabel,
  sourceLabel,
} from "../../../modules/engagement/consumer-rules"

export type ConsumerRow = {
  id?: string
  email?: string | null
  name?: string | null
  country_code?: string | null
  locale?: string | null
  source?: string | null
  newsletter_enabled?: boolean
  subscribed_at?: unknown
  unsubscribed_at?: unknown
  updated_at?: unknown
  created_at?: unknown
}

function iso(value: unknown): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/** Publieke consumentweergave. Geen token, geen customer-id. */
export function presentConsumer(row: ConsumerRow) {
  return {
    id: row.id ?? "",
    name: row.name?.trim() || "",
    email: row.email?.trim() || "",
    country: countryLabel(row.country_code),
    language: localeLabel(row.locale),
    newsletter: newsletterLabel(Boolean(row.newsletter_enabled)),
    newsletter_enabled: Boolean(row.newsletter_enabled),
    source: sourceLabel(row.source),
    subscribed_at: iso(row.subscribed_at),
    unsubscribed_at: iso(row.unsubscribed_at),
    updated_at: iso(row.updated_at ?? row.created_at),
  }
}
