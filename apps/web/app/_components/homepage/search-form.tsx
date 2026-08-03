"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

type SearchFormProps = {
  /** Hero-zoekbalk (vergroot) vs. header-zoekbalk. */
  variant: "header" | "hero"
  placeholder: string
}

/**
 * Zoekformulier — navigeert naar `/zoeken` (Search/Catalog-fase).
 * Geen eigen zoeklogica; alleen UI + query-string.
 */
export function SearchForm({ variant, placeholder }: SearchFormProps) {
  const router = useRouter()
  const [q, setQ] = useState("")

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
      ? "mx-auto mb-[18px] flex h-[50px] w-full max-w-[600px] items-center rounded-lg border-2 border-wf-800 bg-white px-[18px]"
      : "flex h-10 flex-1 items-center rounded-md border-[1.5px] border-wf-700 px-3.5"

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={shell}
      aria-label="Producten zoeken"
    >
      <label htmlFor={`homepage-search-${variant}`} className="sr-only">
        Zoeken
      </label>
      <input
        id={`homepage-search-${variant}`}
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
