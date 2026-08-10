"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { resolveStorefrontLocale } from "./detect-locale"
import {
  DEFAULT_STOREFRONT_LOCALE,
  LOCALE_COOKIE,
  type StorefrontLocale,
} from "./locales"
import { useStorefrontLocaleFromProvider } from "./storefront-locale-provider"

const STORAGE_KEY = LOCALE_COOKIE

function readCookieLocale(): string | undefined {
  if (typeof document === "undefined") return undefined
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1]
}

function readStoredPreference(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Cookie → localStorage → navigator → NL (shared with catalog helpers). */
export function readLocaleFromBrowser(): StorefrontLocale {
  if (typeof document === "undefined") return DEFAULT_STOREFRONT_LOCALE
  return resolveStorefrontLocale({
    // Manual preference (localStorage) wins over cookie when both differ.
    storedPreference: readStoredPreference(),
    cookieValue: readCookieLocale(),
    navigatorLanguage:
      typeof navigator !== "undefined" ? navigator.language : null,
    navigatorLanguages:
      typeof navigator !== "undefined" ? navigator.languages : null,
  })
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined
  const onFocus = () => onStoreChange()
  window.addEventListener("storage", onStoreChange)
  window.addEventListener("focus", onFocus)
  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener("focus", onFocus)
  }
}

/**
 * Client locale: first paint from root StorefrontLocaleProvider (server cookie /
 * Accept-Language), daarna browser cookie/localStorage/navigator.
 */
export function useStorefrontLocale(): StorefrontLocale {
  const fromProvider = useStorefrontLocaleFromProvider()
  const fromBrowser = useSyncExternalStore(
    subscribe,
    readLocaleFromBrowser,
    () => DEFAULT_STOREFRONT_LOCALE
  )
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted ? fromBrowser : fromProvider
}
