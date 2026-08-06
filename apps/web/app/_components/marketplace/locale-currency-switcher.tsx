"use client"

import { useEffect, useId, useState } from "react"

const LOCALE_KEY = "em_storefront_locale"
const CURRENCY_KEY = "em_storefront_currency"

const LOCALES = [
  { code: "nl", label: "NL" },
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
] as const

const CURRENCIES = [
  { code: "EUR", label: "€" },
  { code: "PLN", label: "zł" },
] as const

/**
 * Taal- en valutakeuze — persist voorkeur; voorbereid op Medusa Region/i18n.
 */
export function LocaleCurrencySwitcher() {
  const localeId = useId()
  const currencyId = useId()
  const [locale, setLocale] = useState("nl")
  const [currency, setCurrency] = useState("EUR")

  useEffect(() => {
    setLocale(localStorage.getItem(LOCALE_KEY) ?? "nl")
    setCurrency(localStorage.getItem(CURRENCY_KEY) ?? "EUR")
  }, [])

  function changeLocale(value: string) {
    setLocale(value)
    localStorage.setItem(LOCALE_KEY, value)
    document.documentElement.lang = value === "nl" ? "nl" : value
  }

  function changeCurrency(value: string) {
    setCurrency(value)
    localStorage.setItem(CURRENCY_KEY, value)
  }

  return (
    <div
      className="hidden items-center gap-1 text-[11px] text-wf-600 tablet:flex"
      aria-label="Taal en valuta"
    >
      <label htmlFor={localeId} className="sr-only">
        Taal
      </label>
      <select
        id={localeId}
        value={locale}
        onChange={(e) => changeLocale(e.target.value)}
        className="cursor-pointer rounded border-0 bg-transparent py-0.5 pr-1 font-semibold text-wf-700 focus:outline-none focus:ring-1 focus:ring-wf-500"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <span aria-hidden>·</span>
      <label htmlFor={currencyId} className="sr-only">
        Valuta
      </label>
      <select
        id={currencyId}
        value={currency}
        onChange={(e) => changeCurrency(e.target.value)}
        className="cursor-pointer rounded border-0 bg-transparent py-0.5 pr-1 font-semibold text-wf-700 focus:outline-none focus:ring-1 focus:ring-wf-500"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label} {c.code}
          </option>
        ))}
      </select>
    </div>
  )
}
