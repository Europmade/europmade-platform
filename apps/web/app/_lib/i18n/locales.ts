/**
 * Storefront i18n — MVP locales (NL/EN/DE/FR).
 * Cookie + localStorage keys remain multi-currency / multi-locale ready.
 */

export const STOREFRONT_LOCALES = ["nl", "en", "de", "fr"] as const

export type StorefrontLocale = (typeof STOREFRONT_LOCALES)[number]

export const DEFAULT_STOREFRONT_LOCALE: StorefrontLocale = "nl"

export const LOCALE_COOKIE = "em_storefront_locale"
export const CURRENCY_COOKIE = "em_storefront_currency"

export type LocalizedString = Record<StorefrontLocale, string>

export function isStorefrontLocale(value: string): value is StorefrontLocale {
  return (STOREFRONT_LOCALES as readonly string[]).includes(value)
}

export function pickLocalized(
  value: LocalizedString | string | null | undefined,
  locale: StorefrontLocale
): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  const ordered = [value[locale], value.nl, value.en]
  for (const part of ordered) {
    if (typeof part === "string" && part.trim()) return part
  }
  return ""
}

/** Helper for mock CMS authoring. */
export function L(
  nl: string,
  en: string,
  de: string,
  fr: string
): LocalizedString {
  return { nl, en, de, fr }
}

/** BCP 47 tag for `Intl` / `toLocaleDateString`. */
export function storefrontIntlLocale(locale: StorefrontLocale): string {
  switch (locale) {
    case "en":
      return "en-GB"
    case "de":
      return "de-DE"
    case "fr":
      return "fr-FR"
    default:
      return "nl-NL"
  }
}
