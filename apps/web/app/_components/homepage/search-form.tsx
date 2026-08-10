"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useId, useState } from "react"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"

type SearchFormProps = {
  /** Hero-zoekbalk (vergroot) vs. header-zoekbalk. */
  variant: "header" | "hero"
  placeholder: string
  /** Optionele voorinvulling (bijv. huidige `/zoeken?q=`). */
  initialQuery?: string
  locale?: StorefrontLocale
}

/**
 * Zoekformulier — navigeert naar `/zoeken` (Search/Catalog-fase).
 * Geen eigen zoeklogica; alleen UI + query-string.
 */
export function SearchForm({
  variant,
  placeholder,
  initialQuery = "",
  locale = DEFAULT_STOREFRONT_LOCALE,
}: SearchFormProps) {
  const router = useRouter()
  const inputId = useId()
  const [q, setQ] = useState(initialQuery)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const query = q.trim()
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    const qs = params.toString()
    router.push(qs ? `/zoeken?${qs}` : "/zoeken")
  }

  const shell =
    variant === "hero"
      ? "mx-auto flex h-[52px] w-full max-w-[720px] items-center rounded-xl border border-wf-300 bg-white px-4 shadow-sm transition focus-within:border-wf-800 focus-within:shadow-md"
      : "flex h-10 flex-1 items-center rounded-md border-[1.5px] border-wf-700 px-3.5"

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={shell}
      aria-label={t("searchAria", locale)}
    >
      <label htmlFor={inputId} className="sr-only">
        {t("searchLabel", locale)}
      </label>
      <input
        id={inputId}
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-wf-900 placeholder:text-wf-600 focus:outline-none"
        autoComplete="off"
      />
    </form>
  )
}
