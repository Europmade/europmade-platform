"use client"

import { useEffect, useId, useState } from "react"
import {
  CURRENCY_COOKIE,
  DEFAULT_STOREFRONT_LOCALE,
  isStorefrontLocale,
  LOCALE_COOKIE,
  STOREFRONT_LOCALES,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"

const LOCALE_KEY = "em_storefront_locale"
const CURRENCY_KEY = "em_storefront_currency"

const LOCALE_LABELS: Record<StorefrontLocale, string> = {
  nl: "NL",
  en: "EN",
  de: "DE",
  fr: "FR",
}

/**
 * Multi-currency architecture: full catalog kept for future regions.
 * MVP UI exposes Euro only.
 */
const ALL_CURRENCIES = [
  { code: "EUR", label: "€", mvpVisible: true },
  { code: "PLN", label: "zł", mvpVisible: false },
] as const

const MVP_CURRENCIES = ALL_CURRENCIES.filter((c) => c.mvpVisible)

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`
}

/**
 * Taal- en valutakeuze — persist voorkeur; voorbereid op Medusa Region/i18n.
 */
export function LocaleCurrencySwitcher() {
  const localeId = useId()
  const currencyId = useId()
  const [locale, setLocale] = useState<StorefrontLocale>(DEFAULT_STOREFRONT_LOCALE)
  const [currency, setCurrency] = useState("EUR")

  useEffect(() => {
    const storedLocale = localStorage.getItem(LOCALE_KEY) ?? ""
    setLocale(
      isStorefrontLocale(storedLocale)
        ? storedLocale
        : DEFAULT_STOREFRONT_LOCALE
    )
    const storedCurrency = localStorage.getItem(CURRENCY_KEY) ?? "EUR"
    const allowed = MVP_CURRENCIES.some((c) => c.code === storedCurrency)
      ? storedCurrency
      : "EUR"
    setCurrency(allowed)
  }, [])

  function changeLocale(value: string) {
    if (!isStorefrontLocale(value)) return
    setLocale(value)
    localStorage.setItem(LOCALE_KEY, value)
    setCookie(LOCALE_COOKIE, value)
    document.documentElement.lang = value
    // SSR homepage resolves from cookie — soft reload to apply CMS locale.
    window.location.reload()
  }

  function changeCurrency(value: string) {
    if (!MVP_CURRENCIES.some((c) => c.code === value)) return
    setCurrency(value)
    localStorage.setItem(CURRENCY_KEY, value)
    setCookie(CURRENCY_COOKIE, value)
  }

  return (
    <div
      className="hidden items-center gap-1 text-[11px] text-wf-600 tablet:flex"
      aria-label={t("languageAndCurrency", locale)}
    >
      <label htmlFor={localeId} className="sr-only">
        {t("language", locale)}
      </label>
      <select
        id={localeId}
        value={locale}
        onChange={(e) => changeLocale(e.target.value)}
        className="cursor-pointer rounded border-0 bg-transparent py-0.5 pr-1 font-semibold text-wf-700 focus:outline-none focus:ring-1 focus:ring-wf-500"
      >
        {STOREFRONT_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
      <span aria-hidden>·</span>
      <label htmlFor={currencyId} className="sr-only">
        {t("currency", locale)}
      </label>
      <select
        id={currencyId}
        value={currency}
        onChange={(e) => changeCurrency(e.target.value)}
        className="cursor-pointer rounded border-0 bg-transparent py-0.5 pr-1 font-semibold text-wf-700 focus:outline-none focus:ring-1 focus:ring-wf-500"
        aria-readonly={MVP_CURRENCIES.length === 1}
      >
        {MVP_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label} {c.code}
          </option>
        ))}
      </select>
    </div>
  )
}
