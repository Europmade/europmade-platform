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
