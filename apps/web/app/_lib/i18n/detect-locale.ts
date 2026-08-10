/**
 * Storefront locale detection — cookie/manual preference first, then
 * Accept-Language / navigator language tags, then NL fallback.
 *
 * Auto-detected locales are NOT persisted; only LocaleCurrencySwitcher
 * writes `em_storefront_locale` (+ localStorage) on explicit user choice.
 */

import {
  DEFAULT_STOREFRONT_LOCALE,
  isStorefrontLocale,
  STOREFRONT_LOCALES,
  type StorefrontLocale,
} from "./locales"

export type LanguagePreference = {
  /** Lowercased BCP 47 tag, e.g. "en-us", "nl", "de-de". */
  tag: string
  /** Quality factor 0–1 (Accept-Language `q=`). */
  q: number
}

/**
 * Parse an Accept-Language header into ordered preferences (highest q first).
 * Extensible: matching uses language primary subtag against STOREFRONT_LOCALES.
 */
export function parseAcceptLanguageHeader(
  header: string | null | undefined
): LanguagePreference[] {
  if (!header || !header.trim()) return []

  const parts = header.split(",")
  const prefs: LanguagePreference[] = []

  for (const raw of parts) {
    const segment = raw.trim()
    if (!segment) continue
    const [tagPart, ...params] = segment.split(";").map((s) => s.trim())
    if (!tagPart || tagPart === "*") continue

    let q = 1
    for (const param of params) {
      const match = /^q\s*=\s*([0-9.]+)$/i.exec(param)
      if (match) {
        const parsed = Number.parseFloat(match[1]!)
        if (Number.isFinite(parsed)) q = Math.min(1, Math.max(0, parsed))
      }
    }

    prefs.push({ tag: tagPart.toLowerCase(), q })
  }

  return prefs.sort((a, b) => b.q - a.q)
}

/** Map a single language tag (e.g. en-US, nl-BE) onto a supported storefront locale. */
export function matchStorefrontLocaleFromTag(
  tag: string | null | undefined
): StorefrontLocale | null {
  if (!tag) return null
  const normalized = tag.trim().toLowerCase().replace(/_/g, "-")
  if (!normalized || normalized === "*") return null

  if (isStorefrontLocale(normalized)) return normalized

  const primary = normalized.split("-")[0]
  if (primary && isStorefrontLocale(primary)) return primary

  return null
}

/**
 * Pick the best supported storefront locale from ordered language preferences.
 * Returns null when none match (caller applies NL fallback).
 */
export function matchStorefrontLocaleFromPreferences(
  preferences: LanguagePreference[]
): StorefrontLocale | null {
  for (const pref of preferences) {
    const matched = matchStorefrontLocaleFromTag(pref.tag)
    if (matched) return matched
  }
  return null
}

/** Resolve from Accept-Language header string; unsupported → null. */
export function detectLocaleFromAcceptLanguage(
  header: string | null | undefined
): StorefrontLocale | null {
  return matchStorefrontLocaleFromPreferences(parseAcceptLanguageHeader(header))
}

/** Resolve from navigator.language / languages; unsupported → null. */
export function detectLocaleFromNavigator(
  language: string | null | undefined,
  languages?: readonly string[] | null
): StorefrontLocale | null {
  const tags: string[] = []
  if (languages) {
    for (const lang of languages) {
      if (lang) tags.push(lang)
    }
  }
  if (language) tags.push(language)

  const preferences = tags.map((tag, index) => ({
    tag: tag.toLowerCase().replace(/_/g, "-"),
    // Preserve array order as descending preference when no q-values.
    q: 1 - index * 0.001,
  }))

  return matchStorefrontLocaleFromPreferences(preferences)
}

export type ResolveStorefrontLocaleInput = {
  /** `em_storefront_locale` cookie value (manual or previously stored). */
  cookieValue?: string | null
  /**
   * Client-only explicit preference (localStorage). Set only by the language
   * switcher — treated as manual choice (highest priority on the client).
   */
  storedPreference?: string | null
  /** Raw `Accept-Language` header (server). */
  acceptLanguage?: string | null
  /** `navigator.language` (client fallback). */
  navigatorLanguage?: string | null
  /** `navigator.languages` (client fallback). */
  navigatorLanguages?: readonly string[] | null
}

/**
 * Priority:
 * 1. Manual stored preference (localStorage)
 * 2. Valid `em_storefront_locale` cookie
 * 3. Browser language (Accept-Language or navigator)
 * 4. NL fallback
 *
 * Does not persist anything — callers that auto-detect must not write cookie/storage.
 */
export function resolveStorefrontLocale(
  input: ResolveStorefrontLocaleInput = {}
): StorefrontLocale {
  if (input.storedPreference && isStorefrontLocale(input.storedPreference)) {
    return input.storedPreference
  }

  if (input.cookieValue && isStorefrontLocale(input.cookieValue)) {
    return input.cookieValue
  }

  const fromAccept = detectLocaleFromAcceptLanguage(input.acceptLanguage)
  if (fromAccept) return fromAccept

  const fromNavigator = detectLocaleFromNavigator(
    input.navigatorLanguage,
    input.navigatorLanguages
  )
  if (fromNavigator) return fromNavigator

  return DEFAULT_STOREFRONT_LOCALE
}

/** Exposed for tests / future locale expansion checks. */
export function supportedStorefrontLocales(): readonly StorefrontLocale[] {
  return STOREFRONT_LOCALES
}
