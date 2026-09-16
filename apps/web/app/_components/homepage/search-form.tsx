"use client"

import { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import {
  suggestStorefrontSearch,
  type StorefrontSearchSuggestion,
} from "../../_lib/client-catalog"

type SearchFormProps = {
  /** Hero-zoekbalk (vergroot) vs. header-zoekbalk. */
  variant: "header" | "hero"
  placeholder: string
  /** Optionele voorinvulling (bijv. huidige `/zoeken?q=`). */
  initialQuery?: string
  locale?: StorefrontLocale
}

const DEBOUNCE_MS = 280
const MIN_QUERY_CHARS = 2

/**
 * Zoekformulier — navigeert naar `/zoeken` (Search/Catalog-fase).
 * Suggesties hergebruiken GET /store/catalog/products?q= (debounced, same-origin).
 */
export function SearchForm({
  variant,
  placeholder,
  initialQuery = "",
  locale = DEFAULT_STOREFRONT_LOCALE,
}: SearchFormProps) {
  const router = useRouter()
  const inputId = useId()
  const listboxId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<StorefrontSearchSuggestion[]>(
    []
  )
  const [activeIndex, setActiveIndex] = useState(-1)
  const [panelBox, setPanelBox] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  function goToSearch(query: string) {
    const trimmed = query.trim()
    const params = new URLSearchParams()
    if (trimmed) params.set("q", trimmed)
    const qs = params.toString()
    setOpen(false)
    router.push(qs ? `/zoeken?${qs}` : "/zoeken")
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    goToSearch(q)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const query = q.trim()
    if (query.length < MIN_QUERY_CHARS) {
      setSuggestions([])
      setLoading(false)
      setActiveIndex(-1)
      setOpen(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const rows = await suggestStorefrontSearch(query, {
          limit: 6,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setSuggestions(rows)
        setActiveIndex(-1)
        setOpen(true)
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        setSuggestions([])
        setOpen(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [q])

  const optionCount =
    suggestions.length + (q.trim().length >= MIN_QUERY_CHARS ? 1 : 0)
  const showPanel = open && q.trim().length >= MIN_QUERY_CHARS
  const activeOptionId =
    showPanel && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined

  useLayoutEffect(() => {
    if (!showPanel) {
      setPanelBox(null)
      return
    }
    function update() {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setPanelBox({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 220),
      })
    }
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [showPanel, suggestions, loading, q])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (wrapRef.current?.contains(target)) return
      const list = document.getElementById(listboxId)
      if (list?.contains(target)) return
      setOpen(false)
      setActiveIndex(-1)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [listboxId])

  const shell =
    variant === "hero"
      ? "mx-auto flex h-[52px] w-full max-w-[720px] items-center rounded-xl border border-wf-300 bg-white px-4 shadow-sm transition focus-within:border-wf-800 focus-within:shadow-md"
      : "flex h-10 flex-1 items-center rounded-md border-[1.5px] border-wf-700 px-3.5"

  const listbox =
    showPanel && mounted && panelBox ? (
      <ul
        id={listboxId}
        role="listbox"
        aria-label={t("searchSuggestions", locale)}
        style={{
          position: "fixed",
          top: panelBox.top,
          left: panelBox.left,
          width: panelBox.width,
          zIndex: 80,
        }}
        className="max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-wf-200 bg-white py-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
      >
        {loading && suggestions.length === 0 ? (
          <li className="px-3 py-2.5 text-[12px] text-wf-500" role="presentation">
            {t("searchLabel", locale)}…
          </li>
        ) : null}
        {!loading && suggestions.length === 0 ? (
          <li className="px-3 py-2.5 text-[12px] text-wf-500" role="presentation">
            {t("searchNoSuggestions", locale)}
          </li>
        ) : null}
        {suggestions.map((item, index) => {
          const selected = index === activeIndex
          return (
            <li
              key={item.id}
              id={`${listboxId}-opt-${index}`}
              role="option"
              aria-selected={selected}
            >
              <button
                type="button"
                className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] ${
                  selected ? "bg-wf-100" : "hover:bg-wf-50"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setOpen(false)
                  router.push(`/product/${item.id}`)
                }}
              >
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-wf-100">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-wf-900">
                    {item.title}
                  </span>
                  {item.brand ? (
                    <span className="block truncate text-[11px] text-wf-500">
                      {item.brand}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
        <li
          id={`${listboxId}-opt-${suggestions.length}`}
          role="option"
          aria-selected={activeIndex === suggestions.length}
        >
          <button
            type="button"
            className={`flex min-h-11 w-full items-center px-3 py-2.5 text-left text-[12.5px] font-semibold ${
              activeIndex === suggestions.length
                ? "bg-wf-100 text-wf-900"
                : "text-wf-700 hover:bg-wf-50"
            }`}
            onMouseEnter={() => setActiveIndex(suggestions.length)}
            onClick={() => goToSearch(q)}
          >
            {tFormat("searchViewAllResults", locale, { query: q.trim() })}
          </button>
        </li>
      </ul>
    ) : null

  return (
    <div
      ref={wrapRef}
      className={
        variant === "hero"
          ? "relative z-50 mx-auto w-full max-w-[720px]"
          : "relative z-50 min-w-0 flex-1 overflow-visible"
      }
    >
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
          onChange={(e) => {
            setQ(e.target.value)
            if (e.target.value.trim().length >= MIN_QUERY_CHARS) setOpen(true)
          }}
          onFocus={() => {
            if (q.trim().length >= MIN_QUERY_CHARS) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (!showPanel && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              if (q.trim().length >= MIN_QUERY_CHARS) setOpen(true)
              return
            }
            if (!showPanel) return
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActiveIndex((i) => (i + 1) % optionCount)
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1))
            } else if (e.key === "Escape") {
              e.preventDefault()
              setOpen(false)
              setActiveIndex(-1)
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-wf-900 placeholder:text-wf-600 focus:outline-none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
        />
      </form>
      {listbox && mounted ? createPortal(listbox, document.body) : null}
    </div>
  )
}
