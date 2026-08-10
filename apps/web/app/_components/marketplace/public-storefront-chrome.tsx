import type { ReactNode } from "react"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { PublicHeader } from "./public-header"
import { SiteFooter } from "./site-footer"

/**
 * Gedeelde publieke chrome (CMP-001 header + CMP-002 footer).
 * Locale moet als prop worden doorgegeven (geen next/headers hier —
 * dit component wordt ook vanuit Client Components gebruikt).
 */
export function PublicStorefrontChrome({
  children,
  searchQuery = "",
  locale = DEFAULT_STOREFRONT_LOCALE,
}: {
  children: ReactNode
  searchQuery?: string
  locale?: StorefrontLocale
}) {
  return (
    <div className="min-h-screen bg-wf-100 text-wf-800">
      <div className="mx-auto max-w-[1160px] border border-wf-200 bg-white shadow-sm">
        <PublicHeader
          searchQuery={searchQuery}
          alwaysShowSearch
          locale={locale}
        />
        {children}
        <SiteFooter locale={locale} />
      </div>
    </div>
  )
}
