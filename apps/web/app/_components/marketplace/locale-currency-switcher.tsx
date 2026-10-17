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
import { readLocaleFromBrowser } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import { STOREFRONT_COUNTRIES } from "../../_lib/storefront-countries"

const LOCALE_KEY = "em_storefront_locale"
const CURRENCY_KEY = "em_storefront_currency"
const MARKET_KEY = "em_storefront_market"
const MARKET_SUGGESTION_KEY = "em_storefront_market_suggestion"

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
  const countryId = useId()
  const [locale, setLocale] = useState<StorefrontLocale>(DEFAULT_STOREFRONT_LOCALE)
  const [currency, setCurrency] = useState("EUR")
  const [market, setMarket] = useState("NL")
  const [marketSuggested, setMarketSuggested] = useState(false)

  useEffect(() => {
    // Display current resolved locale; do not persist auto-detection here.
    // Manual choice writes cookie + localStorage in changeLocale only.
    setLocale(readLocaleFromBrowser())
    const storedCurrency = localStorage.getItem(CURRENCY_KEY) ?? "EUR"
    const allowed = MVP_CURRENCIES.some((c) => c.code === storedCurrency)
      ? storedCurrency
      : "EUR"
    setCurrency(allowed)
    const explicit = readCookie(MARKET_KEY)
    const suggested = readCookie(MARKET_SUGGESTION_KEY)
    const known = STOREFRONT_COUNTRIES.some((c) => c.code === (explicit || suggested))
    if (explicit && known) {
      setMarket(explicit)
      setMarketSuggested(false)
    } else if (suggested && known) {
      setMarket(suggested)
      setMarketSuggested(true)
    }
  }, [])

  function readCookie(name: string): string {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
    return decodeURIComponent(match?.[1] ?? "").trim().toUpperCase()
  }

  function changeLocale(value: string) {
    if (!isStorefrontLocale(value)) return
    setLocale(value)
    localStorage.setItem(LOCALE_KEY, value)
    setCookie(LOCALE_COOKIE, value)
    document.documentElement.lang = value
    // SSR resolves from cookie — soft reload to apply CMS locale.
    window.location.reload()
  }

  function changeMarket(value: string) {
    if (!STOREFRONT_COUNTRIES.some((country) => country.code === value)) return
    setMarket(value)
    setMarketSuggested(false)
    setCookie(MARKET_KEY, value)
    document.cookie = `${MARKET_SUGGESTION_KEY}=;path=/;max-age=0;samesite=lax`
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
      className="flex items-center gap-1 text-[11px] text-wf-600"
      aria-label={t("languageAndCurrency", locale)}
    >
      <label htmlFor={localeId} className="sr-only">
        {t("language", locale)}
      </label>
      <select
        id={localeId}
        value={locale}
        onChange={(e) => changeLocale(e.target.value)}
        className="em-header-locale cursor-pointer rounded border-0 bg-transparent py-0.5 pr-1 font-semibold focus:outline-none focus:ring-1 focus:ring-white/40"
        style={{
          color: "var(--em-header-locale, #4a4a4a)",
          fontSize: "var(--em-header-locale-size, 11px)",
        }}
      >
        {STOREFRONT_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
      <span aria-hidden style={{ color: "var(--em-header-text, #4a4a4a)" }}>
        ·
      </span>
      <label htmlFor={countryId} className="sr-only">
        {t("deliveryCountry", locale)}
      </label>
      <select
        id={countryId}
        value={market}
        onChange={(e) => changeMarket(e.target.value)}
        className="em-header-locale cursor-pointer rounded border-0 bg-transparent py-0.5 pr-1 font-semibold focus:outline-none focus:ring-1 focus:ring-white/40"
        style={{
          color: "var(--em-header-locale, #4a4a4a)",
          fontSize: "var(--em-header-locale-size, 11px)",
        }}
        title={marketSuggested ? t("suggestedCountry", locale) : t("deliveryCountry", locale)}
      >
        {STOREFRONT_COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.code}
            {marketSuggested && country.code === market ? " *" : ""}
          </option>
        ))}
      </select>
      <span aria-hidden style={{ color: "var(--em-header-text, #4a4a4a)" }}>
        ·
      </span>
      <label htmlFor={currencyId} className="sr-only">
        {t("currency", locale)}
      </label>
      <select
        id={currencyId}
        value={currency}
        onChange={(e) => changeCurrency(e.target.value)}
        className="em-header-currency cursor-pointer rounded border-0 bg-transparent py-0.5 pr-1 font-semibold focus:outline-none focus:ring-1 focus:ring-white/40"
        style={{
          color: "var(--em-header-currency, #4a4a4a)",
          fontSize: "var(--em-header-currency-size, 11px)",
        }}
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
