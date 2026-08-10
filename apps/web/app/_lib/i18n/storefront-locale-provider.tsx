"use client"

import { createContext, useContext, useMemo } from "react"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "./locales"

const StorefrontLocaleContext = createContext<StorefrontLocale>(
  DEFAULT_STOREFRONT_LOCALE
)

export function StorefrontLocaleProvider({
  locale,
  children,
}: {
  locale: StorefrontLocale
  children: React.ReactNode
}) {
  const value = useMemo(() => locale, [locale])
  return (
    <StorefrontLocaleContext.Provider value={value}>
      {children}
    </StorefrontLocaleContext.Provider>
  )
}

export function useStorefrontLocaleFromProvider(): StorefrontLocale {
  return useContext(StorefrontLocaleContext)
}
