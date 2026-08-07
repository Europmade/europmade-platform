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
  value: LocalizedString | string,
  locale: StorefrontLocale
): string {
  if (typeof value === "string") return value
  return value[locale] ?? value.nl ?? value.en
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
