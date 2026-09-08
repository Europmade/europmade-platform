"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  CMS_LOCALE_KEY,
  CMS_LOCALE_LABEL,
  CMS_LOCALE_MODE_KEY,
  CMS_LOCALES,
  type CmsLocale,
  type CmsLocaleMode,
} from "../../lib/cms-i18n"
import { getCmsTranslateStatus } from "../../lib/cms-admin-api"

type Ctx = {
  mode: CmsLocaleMode
  setMode: (mode: CmsLocaleMode) => void
  locale: CmsLocale
  setLocale: (locale: CmsLocale) => void
  visibleLocales: CmsLocale[]
  translateConfigured: boolean
  translateMessage: string
}

const CmsLocaleContext = createContext<Ctx | null>(null)

export function CmsLocaleProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<CmsLocaleMode>("dropdown")
  const [locale, setLocaleState] = useState<CmsLocale>("nl")
  const [translateConfigured, setTranslateConfigured] = useState(false)
  const [translateMessage, setTranslateMessage] = useState("")

  useEffect(() => {
    try {
      const storedMode = localStorage.getItem(CMS_LOCALE_MODE_KEY)
      if (storedMode === "all" || storedMode === "dropdown") {
        setModeState(storedMode)
      }
      const storedLoc = localStorage.getItem(CMS_LOCALE_KEY)
      if (storedLoc === "nl" || storedLoc === "en" || storedLoc === "de" || storedLoc === "fr") {
        setLocaleState(storedLoc)
      }
    } catch {
      /* ignore */
    }
    getCmsTranslateStatus()
      .then((r) => {
        setTranslateConfigured(r.configured)
        setTranslateMessage(r.message)
      })
      .catch(() => {
        setTranslateConfigured(false)
        setTranslateMessage("Vertaalstatus kon niet worden geladen.")
      })
  }, [])

  const setMode = useCallback((next: CmsLocaleMode) => {
    setModeState(next)
    try {
      localStorage.setItem(CMS_LOCALE_MODE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const setLocale = useCallback((next: CmsLocale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(CMS_LOCALE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const visibleLocales = useMemo(
    () => (mode === "all" ? [...CMS_LOCALES] : [locale]),
    [mode, locale]
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      locale,
      setLocale,
      visibleLocales,
      translateConfigured,
      translateMessage,
    }),
    [mode, setMode, locale, setLocale, visibleLocales, translateConfigured, translateMessage]
  )

  return (
    <CmsLocaleContext.Provider value={value}>{children}</CmsLocaleContext.Provider>
  )
}

export function useCmsLocale() {
  const ctx = useContext(CmsLocaleContext)
  if (!ctx) {
    throw new Error("useCmsLocale moet binnen CmsLocaleProvider")
  }
  return ctx
}

export function CmsLocaleToolbar({ compact = false }: { compact?: boolean }) {
  const {
    mode,
    setMode,
    locale,
    setLocale,
    translateConfigured,
    translateMessage,
  } = useCmsLocale()

  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-3 ${
        compact ? "" : "rounded-xl border border-wf-200 bg-white px-4 py-3"
      }`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-wf-700">
          Talen tonen
          <select
            className="mt-1 block rounded-lg border border-wf-300 bg-white px-3 py-1.5 text-sm text-wf-900"
            value={mode}
            onChange={(e) =>
              setMode(e.target.value === "all" ? "all" : "dropdown")
            }
          >
            <option value="dropdown">Dropdown (één taal)</option>
            <option value="all">Alle talen naast elkaar</option>
          </select>
        </label>
        {mode === "dropdown" ? (
          <label className="text-xs font-semibold text-wf-700">
            Taal
            <select
              className="mt-1 block rounded-lg border border-wf-300 bg-white px-3 py-1.5 text-sm text-wf-900"
              value={locale}
              onChange={(e) => setLocale(e.target.value as CmsLocale)}
            >
              {CMS_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {CMS_LOCALE_LABEL[code]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="flex gap-1 pb-0.5">
            {CMS_LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  locale === code
                    ? "bg-wf-900 text-white"
                    : "border border-wf-200 bg-wf-50 text-wf-700"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="max-w-sm text-[11px] leading-snug text-wf-500">
        {translateConfigured
          ? translateMessage
          : translateMessage || "Automatische vertaling is niet geconfigureerd."}
      </p>
    </div>
  )
}
