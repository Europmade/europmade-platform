import { randomBytes } from "node:crypto"

/** Preview in de nieuwsbrief. Deze waarde schrijft nooit een voorkeur. */
export const NEWSLETTER_PREVIEW_TOKEN = "voorbeeld"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ConsumerSource = "website" | "account" | "admin"

export function normalizeConsumerEmail(value: string): string {
  const email = value.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Voer een geldig e-mailadres in.")
  }
  return email
}

export function assertConsumerSource(value: string): ConsumerSource {
  if (value === "website" || value === "account" || value === "admin") return value
  throw new Error("Onbekende bron.")
}

export function newUnsubscribeToken(): string {
  return randomBytes(32).toString("base64url")
}

export function isPreviewUnsubscribeToken(token: string): boolean {
  return token.trim() === NEWSLETTER_PREVIEW_TOKEN
}

const COUNTRY_LABELS: Record<string, string> = {
  NL: "Nederland",
  BE: "België",
  DE: "Duitsland",
  FR: "Frankrijk",
  LU: "Luxemburg",
  AT: "Oostenrijk",
  IT: "Italië",
  ES: "Spanje",
  PT: "Portugal",
  IE: "Ierland",
  DK: "Denemarken",
  SE: "Zweden",
  FI: "Finland",
  PL: "Polen",
  CZ: "Tsjechië",
  SK: "Slowakije",
  HU: "Hongarije",
  RO: "Roemenië",
  BG: "Bulgarije",
  GR: "Griekenland",
  HR: "Kroatië",
  SI: "Slovenië",
  EE: "Estland",
  LV: "Letland",
  LT: "Litouwen",
  CY: "Cyprus",
  MT: "Malta",
}

const LOCALE_LABELS: Record<string, string> = {
  nl: "Nederlands",
  en: "Engels",
  de: "Duits",
  fr: "Frans",
  it: "Italiaans",
  es: "Spaans",
}

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  account: "Account",
  admin: "Beheer",
}

export function countryLabel(code: string | null | undefined): string {
  if (!code?.trim()) return "—"
  const key = code.trim().toUpperCase()
  return COUNTRY_LABELS[key] ?? key
}

export function localeLabel(locale: string | null | undefined): string {
  if (!locale?.trim()) return "—"
  const key = locale.trim().toLowerCase().slice(0, 2)
  return LOCALE_LABELS[key] ?? locale.trim()
}

export function sourceLabel(source: string | null | undefined): string {
  if (!source?.trim()) return "—"
  return SOURCE_LABELS[source.trim()] ?? source.trim()
}

export function newsletterLabel(enabled: boolean): string {
  return enabled ? "Ingeschreven" : "Uitgeschreven"
}

/**
 * Drie echte consumentennieuwsbrieven op de bestaande consument.
 * EngagementPreference blijft voor een zakelijk Contact en krijgt hier geen tweede tabel.
 */
export const CONSUMER_NEWSLETTER_TOPICS = ["news", "brands", "offers"] as const

export type ConsumerNewsletterTopic = (typeof CONSUMER_NEWSLETTER_TOPICS)[number]

export type ConsumerNewsletterTopics = Record<ConsumerNewsletterTopic, boolean>

export const CONSUMER_NEWSLETTER_TOPIC_LABELS: Record<ConsumerNewsletterTopic, string> = {
  news: "EuropMade nieuws & inspiratie",
  brands: "Nieuwe Europese merken en producten",
  offers: "Aanbiedingen en acties",
}

export function emptyNewsletterTopics(): ConsumerNewsletterTopics {
  return { news: false, brands: false, offers: false }
}

export function allNewsletterTopics(): ConsumerNewsletterTopics {
  return { news: true, brands: true, offers: true }
}

export function topicsEnableNewsletter(topics: ConsumerNewsletterTopics): boolean {
  return topics.news || topics.brands || topics.offers
}

/**
 * Geen opgeslagen onderwerpen en wel ingeschreven: de bestaande algemene inschrijving.
 * Een opgeslagen keuze blijft zoals die is, ook als alles uit staat.
 */
export function resolveNewsletterTopics(
  stored: unknown,
  newsletterEnabled: boolean
): ConsumerNewsletterTopics {
  if (!newsletterEnabled) return emptyNewsletterTopics()
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return allNewsletterTopics()
  }
  const row = stored as Record<string, unknown>
  return {
    news: row.news === true,
    brands: row.brands === true,
    offers: row.offers === true,
  }
}

export function planNewsletterTopics(input: unknown): ConsumerNewsletterTopics {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Kies per nieuwsbrief of die aan of uit staat.")
  }
  const row = input as Record<string, unknown>
  for (const key of CONSUMER_NEWSLETTER_TOPICS) {
    if (typeof row[key] !== "boolean") {
      throw new Error("Kies per nieuwsbrief of die aan of uit staat.")
    }
  }
  return {
    news: row.news === true,
    brands: row.brands === true,
    offers: row.offers === true,
  }
}
